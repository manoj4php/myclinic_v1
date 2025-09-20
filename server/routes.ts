import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { emailService } from "./emailService";
import { insertPatientSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

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
  debugger;
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    debugger;
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
   
  });

  // Object storage routes for file serving
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
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

    const user = await storage.createUser({
      ...userData,
      createdBy,
      updatedBy: createdBy,
      ipAddress,
    });

    res.status(201).json(user);
  } catch (error) {
    // ...error handling...
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

  // Patient Management Routes
  app.get('/api/patients', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { specialty, search } = req.query;
      let patients;

      if (search) {
        patients = await storage.searchPatients(search as string);
      } else if (specialty) {
        patients = await storage.getPatientsBySpecialty(specialty as string);
      } else {
        patients = await storage.getAllPatients();
      }

      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get('/api/patients/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const patient = await storage.getPatient(id);
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
      const files = await storage.getPatientFiles(id);
      res.json(files);
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
