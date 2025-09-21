import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./replitAuth";
import { getFileStorageProvider } from "./fileStorage";
import { ObjectPermission } from "./objectAcl";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
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

  // Logout endpoint
  app.post('/api/auth/logout', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      // Log the logout action
      console.log(`User ${userId} logging out at ${new Date().toISOString()}`);
      
      // In a more advanced implementation, you could:
      // 1. Invalidate the JWT token by adding it to a blacklist
      // 2. Clear any server-side sessions
      // 3. Log security events
      // 4. Update last activity timestamp
      
      // For now, we'll just acknowledge the logout
      res.json({ 
        message: "Logout successful",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Temporary route to seed database with test user (remove in production)
  app.post('/api/seed-user', async (req, res) => {
    try {
      // Hash the admin password
      const hashedPassword = await hashPassword('admin123');
      
      const testUser = await storage.upsertUser({
        id: 'test-user-1',
        email: 'admin@myclinic.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        role: 'admin',
        specialty: 'medicines',
        isActive: true,
        emailNotifications: true,
      });
      
      console.log('[DEV] Test user created with password: admin123');
      res.json({ message: 'Test user created', user: { ...testUser, password: undefined } });
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
    try {
      // Generate a unique upload endpoint for this file
      const uploadId = crypto.randomUUID();
      const uploadURL = `http://localhost:${process.env.PORT || 5000}/api/upload/${uploadId}`;
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  // File upload handler using new storage system
  app.put("/api/upload/:uploadId", isAuthenticated, async (req, res) => {
    try {
      const { uploadId } = req.params;
      const fileStorage = getFileStorageProvider();
      
      let buffer: Buffer;
      
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // Handle form data
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            buffer = Buffer.concat(chunks);
            const fileName = req.headers['x-file-name'] as string || `upload-${uploadId}`;
            const filePath = await fileStorage.uploadFile(buffer, fileName);
            const fileUrl = fileStorage.getFileUrl(filePath);
            
            res.json({ 
              message: "File uploaded successfully", 
              uploadId,
              filePath,
              fileUrl,
              size: buffer.length
            });
          } catch (error) {
            console.error("Error saving file:", error);
            res.status(500).json({ error: "Failed to save file" });
          }
        });
      } else {
        // Handle raw binary data (Uppy's default method)
        if (Buffer.isBuffer(req.body)) {
          buffer = req.body;
        } else {
          buffer = Buffer.from(req.body);
        }
        
        const fileName = req.headers['x-file-name'] as string || `upload-${uploadId}`;
        const filePath = await fileStorage.uploadFile(buffer, fileName);
        const fileUrl = fileStorage.getFileUrl(filePath);
        
        console.log(`File uploaded successfully: ${fileName}, size: ${buffer.length} bytes`);
        
        res.json({ 
          message: "File uploaded successfully", 
          uploadId,
          filePath,
          fileUrl,
          size: buffer.length,
          // Add the uploadURL field that Uppy expects for the complete event
          uploadURL: fileUrl
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Failed to upload file", error: errorMessage });
    }
  });

  // File serving endpoint
  app.get("/api/files/:fileName", isAuthenticated, async (req, res) => {
    try {
      const { fileName } = req.params;
      const fileStorage = getFileStorageProvider();
      const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "storage/private";
      const uploadDir = path.join(process.cwd(), privateObjectDir, "uploads");
      const filePath = path.join(uploadDir, fileName);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Set appropriate headers for file serving
      const fileExtension = path.extname(fileName).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (fileExtension === '.dcm' || fileExtension === '.dicom') {
        contentType = 'application/dicom';
      } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (fileExtension === '.png') {
        contentType = 'image/png';
      } else if (fileExtension === '.pdf') {
        contentType = 'application/pdf';
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

  // Compatibility endpoint for old upload URLs (GET /api/upload/:uploadId)
  app.get("/api/upload/:uploadId", isAuthenticated, async (req, res) => {
    try {
      const { uploadId } = req.params;
      const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "storage/private";
      const uploadDir = path.join(process.cwd(), privateObjectDir, "uploads");
      const filePath = path.join(uploadDir, uploadId);
      
      console.log(`Compatibility: Serving file from /api/upload/${uploadId} -> ${filePath}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`Compatibility: File not found: ${filePath}`);
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
      
    } catch (error) {
      console.error("Compatibility: Error serving file:", error);
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

  // Compatibility endpoint for old object local-upload URLs
  app.get("/api/objects/local-upload/:objectId", isAuthenticated, async (req, res) => {
    try {
      const { objectId } = req.params;
      const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "storage/private";
      const uploadDir = path.join(process.cwd(), privateObjectDir, "uploads");
      const filePath = path.join(uploadDir, objectId);
      
      console.log(`Compatibility: Serving file from /api/objects/local-upload/${objectId} -> ${filePath}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`Compatibility: File not found: ${filePath}`);
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
      
    } catch (error) {
      console.error("Compatibility: Error serving local-upload file:", error);
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
      
      // Hash the temporary password before storing
      const hashedPassword = await hashPassword(tempPassword);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
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

      // In development environment, log the temporary password to console
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Temporary password for ${userData.email || userData.username}: ${tempPassword}`);
      }

      res.status(201).json({
        ...user,
        password: undefined, // Don't return password in response
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

      // Get the user whose password is being changed
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // If not an admin changing someone else's password, verify current password
      if (id === userId) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required" });
        }
        
        if (!targetUser.password) {
          return res.status(400).json({ message: "User password not properly configured" });
        }

        const bcrypt = await import("bcryptjs");
        const isValidPassword = await bcrypt.compare(currentPassword, targetUser.password);
        if (!isValidPassword) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      // Hash the new password
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update the user's password
      await storage.updateUser(id, {
        password: hashedNewPassword,
        updatedBy: userId,
        ipAddress: req.ip,
      });

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
      const createdBy = req.user?.claims?.sub;
      const ipAddress = req.ip;

      console.log("Creating patient with user ID:", createdBy);
      console.log("Raw request body:", JSON.stringify(req.body, null, 2));

      // Clean the request body before schema validation
      const cleanedBody = { ...req.body };
      
      // Handle foreign key fields - convert empty strings to null or valid values
      if (cleanedBody.reportedBy === "" || !cleanedBody.reportedBy) {
        cleanedBody.reportedBy = createdBy; // Default to the creating user
      }
      
      console.log("Cleaned request body:", JSON.stringify(cleanedBody, null, 2));

      const patientData = insertPatientSchema.parse(cleanedBody);

      // Verify user exists before creating patient
      if (createdBy) {
        const user = await storage.getUser(createdBy);
        if (!user) {
          console.error("User not found:", createdBy);
          return res.status(400).json({ message: "Invalid user ID" });
        }
      }

      // Final patient data preparation
      const finalPatientData = {
        ...patientData,
        doctorId: createdBy,
        reportedBy: patientData.reportedBy || createdBy,
        createdBy,
        updatedBy: createdBy,
        ipAddress,
      };

      console.log("Final patient data:", JSON.stringify(finalPatientData, null, 2));

      const patient = await storage.createPatient(finalPatientData);

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
    let patientId: string | undefined;
    let fileName: string | undefined;
    let fileURL: string | undefined;
    let filePath: string | undefined;
    
    try {
      ({ patientId, fileName, fileURL } = req.body);
      const uploadedBy = req.user?.claims?.sub;
      const ipAddress = req.ip;

      if (!patientId || !fileName || !fileURL) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // For the new storage system, extract the file path from the URL
      filePath = fileURL;
      
      // Handle different URL formats
      if (fileURL.includes('/api/files/')) {
        // New format: http://localhost:5000/api/files/filename.ext
        // This is the correct format that includes the extension
        filePath = fileURL.split('/api/files/')[1];
      } else if (fileURL.includes('/api/upload/')) {
        // Legacy upload format: http://localhost:5000/api/upload/uploadId
        // For legacy uploads, we need to find the actual file with extension
        const uploadId = fileURL.split('/api/upload/')[1];
        
        // Try to find the actual file in storage with extension
        const uploadDir = process.env.PRIVATE_OBJECT_DIR || "storage/private/uploads";
        
        try {
          const files = fs.readdirSync(uploadDir);
          // Look for files that start with the uploadId
          const matchingFile = files.find((file: string) => file.startsWith(uploadId));
          
          if (matchingFile) {
            filePath = matchingFile;
            console.log(`Found matching file for uploadId ${uploadId}: ${matchingFile}`);
          } else {
            // Fallback: try to infer extension from fileName
            const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
            filePath = extension ? `${uploadId}.${extension}` : uploadId;
            console.log(`No exact match found for uploadId ${uploadId}, using inferred path: ${filePath}`);
          }
        } catch (fsError) {
          console.warn(`Could not read upload directory: ${fsError}`);
          // Fallback to original logic
          filePath = uploadId;
        }
      } else if (fileURL.includes('/api/objects/local-upload/')) {
        // Another legacy format: http://localhost:5000/api/objects/local-upload/uploadId
        filePath = fileURL.split('/api/objects/local-upload/')[1];
      }
      
      console.log('Creating patient file with:', { patientId, fileName, filePath: filePath, fileURL });

      const file = await storage.createPatientFile({
        patientId,
        fileName,
        filePath,
        fileType: fileName.split('.').pop() || 'unknown',
        uploadedBy,
        createdBy: uploadedBy,
        updatedBy: uploadedBy,
        ipAddress,
      });

      res.status(201).json({ file, filePath });
    } catch (error) {
      console.error("Error creating patient file:", error);
      console.error("Request data:", { patientId, fileName, fileURL, filePath });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: "Internal server error", details: errorMessage });
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
