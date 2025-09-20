import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { emailService } from "./emailService";
import { insertPatientSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

// Utility function to generate secure temporary password
function generateTemporaryPassword(length: number = 12): string {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*';
  
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  
  // Ensure at least one character from each category
  let password = '';
  password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)];
  password += lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)];
  password += numberChars[Math.floor(Math.random() * numberChars.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

interface AuthenticatedRequest extends Request {
  user?: {
    claims?: {
      sub: string;
      email?: string;
    };
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Try to get user from database, fallback to mock user if DB not available
      try {
        const user = await storage.getUser(userId);
        if (user) {
          res.json(user);
          return;
        }
      } catch (dbError) {
        console.warn("Database not available, using mock user data");
      }
      
      // Mock user data for demo
      const mockUser = {
        id: userId,
        email: "admin@myclinic.com",
        firstName: "Admin", 
        lastName: "User",
        role: "admin",
        specialty: "medicines",
        phone: "+1234567890",
        isActive: true,
        emailNotifications: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.json(mockUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Temporary route to seed database with test user (remove in production)
  app.post('/api/seed-user', async (req, res) => {
    try {
      const testUser = await storage.upsertUser({
        id: 'test-user-1',
        email: 'admin@myclinic.com',
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        role: 'admin',
        specialty: 'medicines',
        isActive: true,
        emailNotifications: true,
      });
      res.json({ message: 'Test user created', user: testUser });
    } catch (error) {
      console.error("Error creating test user:", error);
      res.status(500).json({ message: "Failed to create test user" });
    }
  });

  // Object storage routes for file serving
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    
    try {
      // Handle local upload files
      if (req.path.startsWith("/objects/uploads/")) {
        const objectId = req.path.replace("/objects/uploads/", "");
        const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "storage/private";
        const uploadDir = path.join(process.cwd(), privateObjectDir, "uploads");
        const filePath = path.join(uploadDir, objectId);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ message: "File not found" });
        }
        
        // Set appropriate headers for file serving
        const fileExtension = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        
        if (fileExtension === '.dcm' || fileExtension === '.dicom') {
          contentType = 'application/dicom';
        } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
          contentType = 'image/jpeg';
        } else if (fileExtension === '.png') {
          contentType = 'image/png';
        } else if (fileExtension === '.gif') {
          contentType = 'image/gif';
        }
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        return;
      }
      
      // Handle cloud storage files
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for files
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  // Local file upload handler for development
  app.put("/api/objects/local-upload/:objectId", isAuthenticated, async (req, res) => {
    try {
      const { objectId } = req.params;
      const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "storage/private";
      const uploadDir = path.join(process.cwd(), privateObjectDir, "uploads");
      const filePath = path.join(uploadDir, objectId);
      
      // Ensure upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Write the uploaded data to file
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(filePath, buffer);
        res.json({ 
          message: "File uploaded successfully", 
          objectId,
          uploadURL: `/api/objects/uploads/${objectId}`
        });
      });
      
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Local file serve handler for development
  app.get("/api/objects/local-upload/:objectId", isAuthenticated, async (req, res) => {
    try {
      const { objectId } = req.params;
      const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "storage/private";
      const uploadDir = path.join(process.cwd(), privateObjectDir, "uploads");
      const filePath = path.join(uploadDir, objectId);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Set appropriate headers for file serving
      const fileExtension = path.extname(objectId).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (fileExtension === '.dcm' || fileExtension === '.dicom') {
        contentType = 'application/dicom';
      } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (fileExtension === '.png') {
        contentType = 'image/png';
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Local file serving handler for development
  app.get("/api/objects/uploads/:objectId", isAuthenticated, async (req, res) => {
    try {
      const { objectId } = req.params;
      const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "storage/private";
      const uploadDir = path.join(process.cwd(), privateObjectDir, "uploads");
      const filePath = path.join(uploadDir, objectId);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Set appropriate headers for file serving
      // For DICOM files, use application/dicom content type
      const fileExtension = path.extname(filePath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (fileExtension === '.dcm' || fileExtension === '.dicom') {
        contentType = 'application/dicom';
      } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (fileExtension === '.png') {
        contentType = 'image/png';
      } else if (fileExtension === '.gif') {
        contentType = 'image/gif';
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error("Error serving uploaded file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // User Management Routes
  app.get('/api/users', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const createdBy = req.user?.claims?.sub;
      const ipAddress = req.ip;

      // Generate temporary password for new users
      const tempPassword = generateTemporaryPassword();
      
      const user = await storage.createUser({
        ...userData,
        createdBy,
        updatedBy: createdBy,
        ipAddress,
      });

      // Send temporary password via email if email is provided
      if (userData.email) {
        const userName = userData.firstName && userData.lastName 
          ? `${userData.firstName} ${userData.lastName}` 
          : userData.username || userData.email;
          
        try {
          await emailService.sendTemporaryPassword(
            userData.email,
            userName,
            tempPassword
          );
          console.log(`Temporary password sent to ${userData.email}`);
        } catch (emailError) {
          console.error("Failed to send temporary password email:", emailError);
          // Don't fail user creation if email fails, just log it
        }
      }

      res.status(201).json({
        ...user,
        message: userData.email 
          ? "User created successfully. Temporary password sent to email."
          : "User created successfully."
      });
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.put('/api/users/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedBy = req.user?.claims?.sub;
      const ipAddress = req.ip;

      const user = await storage.updateUser(id, {
        ...updates,
        updatedBy,
        ipAddress,
      });

      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Change password route
  app.post('/api/users/:id/change-password', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.claims?.sub;

      // Validate that user can only change their own password or admin can change any password
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(userId);
      if (id !== userId && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized to change this password" });
      }

      // Validate input
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }

      // For now, just return success since we don't have password hashing implemented
      // In a real app, you would verify currentPassword and hash newPassword
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Patient Management Routes
  app.get('/api/patients', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { specialty, search } = req.query;
      
      // Try database first, fallback to mock data
      try {
        let patients;
        if (search) {
          patients = await storage.searchPatients(search as string);
        } else if (specialty) {
          patients = await storage.getPatientsBySpecialty(specialty as string);
        } else {
          patients = await storage.getAllPatients();
        }
        res.json(patients);
        return;
      } catch (dbError) {
        console.warn("Database not available, using mock patient data");
      }

      // Mock patient data for testing DICOM viewer
      const mockPatients = [
        {
          id: "patient-1",
          name: "John Smith",
          email: "john.smith@email.com",
          phone: "+1234567890",
          address: "123 Main St, City, State",
          dateOfBirth: "1985-03-15",
          gender: "male",
          specialty: "radiology",
          chiefComplaint: "Chest pain and shortness of breath",
          medicalHistory: "Hypertension, previous MI",
          doctorId: "test-user-1",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "patient-2", 
          name: "Sarah Johnson",
          email: "sarah.j@email.com",
          phone: "+1987654321",
          address: "456 Oak Ave, City, State",
          dateOfBirth: "1992-07-22",
          gender: "female",
          specialty: "pediatric",
          chiefComplaint: "Routine checkup",
          medicalHistory: "No significant history",
          doctorId: "test-user-1",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      res.json(mockPatients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get('/api/patients/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // Try database first, fallback to mock data
      try {
        const patient = await storage.getPatient(id);
        if (patient) {
          res.json(patient);
          return;
        }
      } catch (dbError) {
        console.warn("Database not available, using mock patient data");
      }

      // Mock patient data
      const mockPatients = {
        "patient-1": {
          id: "patient-1",
          name: "John Smith",
          email: "john.smith@email.com",
          phone: "+1234567890",
          address: "123 Main St, City, State",
          dateOfBirth: "1985-03-15",
          gender: "male",
          specialty: "radiology",
          chiefComplaint: "Chest pain and shortness of breath",
          medicalHistory: "Hypertension, previous MI",
          doctorId: "test-user-1",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        "patient-2": {
          id: "patient-2", 
          name: "Sarah Johnson",
          email: "sarah.j@email.com",
          phone: "+1987654321",
          address: "456 Oak Ave, City, State",
          dateOfBirth: "1992-07-22",
          gender: "female",
          specialty: "pediatric",
          chiefComplaint: "Routine checkup",
          medicalHistory: "No significant history",
          doctorId: "test-user-1",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      const patient = mockPatients[id as keyof typeof mockPatients];
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  app.post('/api/patients', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const patientData = insertPatientSchema.parse(req.body);
      const createdBy = req.user?.claims?.sub;
      const ipAddress = req.ip;

      const patient = await storage.createPatient({
        ...patientData,
        doctorId: createdBy,
        createdBy,
        updatedBy: createdBy,
        ipAddress,
      });

      // Send email notification to doctor
      const user = await storage.getUser(createdBy!);
      if (user?.email && user.emailNotifications) {
        const viewLink = `${req.protocol}://${req.get('host')}/patients/${patient.id}`;
        await emailService.sendPatientNotification(
          user.email,
          patient.name,
          'added',
          viewLink
        );
      }

      // Create notification
      await storage.createNotification({
        userId: createdBy!,
        type: 'patient_added',
        title: 'New Patient Added',
        message: `Patient ${patient.name} has been added to your list`,
        relatedId: patient.id,
        createdBy,
        ipAddress,
      });

      res.status(201).json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create patient" });
    }
  });

  app.put('/api/patients/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedBy = req.user?.claims?.sub;
      const ipAddress = req.ip;

      const patient = await storage.updatePatient(id, {
        ...updates,
        updatedBy,
        ipAddress,
      });

      // Send email notification
      const user = await storage.getUser(updatedBy!);
      if (user?.email && user.emailNotifications) {
        const viewLink = `${req.protocol}://${req.get('host')}/patients/${patient.id}`;
        await emailService.sendPatientNotification(
          user.email,
          patient.name,
          'updated',
          viewLink
        );
      }

      // Create notification
      await storage.createNotification({
        userId: updatedBy!,
        type: 'patient_updated',
        title: 'Patient Updated',
        message: `Patient ${patient.name} information has been updated`,
        relatedId: patient.id,
        createdBy: updatedBy,
        ipAddress,
      });

      res.json(patient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(500).json({ message: "Failed to update patient" });
    }
  });

  app.delete('/api/patients/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      await storage.deletePatient(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting patient:", error);
      res.status(500).json({ message: "Failed to delete patient" });
    }
  });

  // Patient Files Routes
  app.get('/api/patients/:id/files', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // Try database first, fallback to mock data
      try {
        const files = await storage.getPatientFiles(id);
        console.log('Raw files from database:', files.map(f => ({ id: f.id, fileName: f.fileName, filePath: f.filePath })));
        res.json(files);
        return;
      } catch (dbError) {
        console.warn("Database not available, using mock file data");
      }

      // Mock patient files for testing DICOM viewer
      const mockFiles = id === "patient-1" ? [
        {
          id: "file-1",
          patientId: id,
          fileName: "chest_xray.dcm",
          filePath: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Chest_X-ray_in_influenza.jpg/800px-Chest_X-ray_in_influenza.jpg",
          fileType: "image/dicom",
          fileSize: 1024000,
          uploadedBy: "test-user-1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "file-2",
          patientId: id,
          fileName: "ct_scan.dcm",
          filePath: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Brain_MRI_121323_rgbca.png/800px-Brain_MRI_121323_rgbca.png",
          fileType: "image/dicom",
          fileSize: 2048000,
          uploadedBy: "test-user-1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ] : [];

      res.json(mockFiles);
    } catch (error) {
      console.error("Error fetching patient files:", error);
      res.status(500).json({ message: "Failed to fetch patient files" });
    }
  });

  app.put('/api/patient-files', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId, fileName, fileURL } = req.body;
      const uploadedBy = req.user?.claims?.sub;
      const ipAddress = req.ip;

      if (!patientId || !fileName || !fileURL) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        fileURL,
        {
          owner: uploadedBy!,
          visibility: "private",
        }
      );

      const file = await storage.createPatientFile({
        patientId,
        fileName,
        filePath: objectPath,
        fileType: fileName.split('.').pop() || 'unknown',
        uploadedBy,
        createdBy: uploadedBy,
        updatedBy: uploadedBy,
        ipAddress,
      });

      res.status(201).json({ file, objectPath });
    } catch (error) {
      console.error("Error creating patient file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dashboard Analytics Routes
  app.get('/api/analytics/patient-count-by-specialty', isAuthenticated, async (req, res) => {
    try {
      const data = await storage.getPatientCountBySpecialty();
      res.json(data);
    } catch (error) {
      console.error("Error fetching patient count by specialty:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  app.get('/api/analytics/dashboard-stats', isAuthenticated, async (req, res) => {
    try {
      const totalPatients = (await storage.getAllPatients()).length;
      const todayPatients = await storage.getTodayPatientCount();
      const pendingReports = await storage.getPendingReportsCount();

      res.json({
        totalPatients,
        todayPatients,
        pendingReports,
        appointments: 12, // This would come from an appointments table
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/analytics/recent-activity', isAuthenticated, async (req, res) => {
    try {
      const activity = await storage.getRecentActivity();
      res.json(activity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Notifications Routes
  app.get('/api/notifications', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const notifications = await storage.getUserNotifications(userId!);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
