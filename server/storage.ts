import {
  users,
  patients,
  patientFiles,
  userPermissions,
  notifications,
  patientArchive,
  seoConfigs,
  type User,
  type UpsertUser,
  type Patient,
  type SEOConfig,
  type InsertPatient,
  type PatientFile,
  type InsertPatientFile,
  type UserPermission,
  type InsertUserPermission,
  type Notification,
  type InsertNotification,
  type PatientArchive,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Additional user operations
  getUserByUsername(username: string): Promise<User | undefined>;
  findUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getAllUsers(limit?: number, offset?: number, sortBy?: string, sortOrder?: string, search?: string, role?: string): Promise<{ users: User[], total: number }>;
  
  // Patient operations
  getPatient(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, updates: Partial<Patient>): Promise<Patient>;
  deletePatient(id: string): Promise<void>;
  hardDeletePatient(id: string): Promise<void>;
  getAllPatients(limit?: number, offset?: number, sortBy?: string, sortOrder?: string): Promise<{ patients: Patient[], total: number }>;
  getPatientsBySpecialty(specialty: string, limit?: number, offset?: number, sortBy?: string, sortOrder?: string): Promise<{ patients: Patient[], total: number }>;
  getPatientsByDoctor(doctorId: string): Promise<Patient[]>;
  searchPatients(query: string, limit?: number, offset?: number, sortBy?: string, sortOrder?: string): Promise<{ patients: Patient[], total: number }>;
  
  // Patient files operations
  createPatientFile(file: InsertPatientFile): Promise<PatientFile>;
  getPatientFiles(patientId: string): Promise<PatientFile[]>;
  deletePatientFile(id: string): Promise<void>;
  
  // User permissions operations
  createUserPermission(permission: InsertUserPermission): Promise<UserPermission>;
  getUserPermissions(userId: string): Promise<UserPermission[]>;
  deleteUserPermissions(userId: string): Promise<void>;
  
  // Notifications operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  
  // Archive operations
  archivePatient(patientId: string, archivedBy: string): Promise<PatientArchive>;
  
  // Analytics operations
  getPatientCountBySpecialty(): Promise<Array<{ specialty: string; count: number }>>;
  getTodayPatientCount(): Promise<number>;
  getPendingReportsCount(): Promise<number>;
  getRecentActivity(): Promise<Array<{ type: string; message: string; createdAt: Date }>>;
  
  // SEO operations
  getSEOConfig(path: string): Promise<SEOConfig | undefined>;
  updateSEOConfig(path: string, config: Partial<SEOConfig>): Promise<void>;
  getAllSEOConfigs(): Promise<SEOConfig[]>;
  
  // Patient Comments operations
  getPatientComments(patientId: string): Promise<any[]>;
  addPatientComment(patientId: string, comment: any): Promise<any>;
  updatePatientComment(patientId: string, commentId: string, updates: any): Promise<any>;
  deletePatientComment(patientId: string, commentId: string): Promise<boolean>;
  
  // Patient Timeline operations
  getPatientTimeline(patientId: string): Promise<any[]>;
  addTimelineEvent(patientId: string, event: any): Promise<any>;
  
  // Patient Studies operations
  getPatientStudies(patientId: string): Promise<any[]>;
  
  // Enhanced file storage
  storePatientFile(patientId: string, fileData: any): Promise<string>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Additional user operations
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(
    limit: number = 10, 
    offset: number = 0, 
    sortBy: string = 'createdAt', 
    sortOrder: string = 'desc',
    search?: string,
    role?: string
  ): Promise<{ users: User[], total: number }> {
    // Build base queries
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(sql`(
        lower(${users.firstName}) LIKE lower(${`%${search}%`}) OR 
        lower(${users.lastName}) LIKE lower(${`%${search}%`}) OR 
        lower(${users.email}) LIKE lower(${`%${search}%`})
      )`);
    }
    
    if (role && role !== 'all') {
      whereConditions.push(eq(users.role, role as any));
    }

    // Count total
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
    if (whereConditions.length > 0) {
      countQuery = countQuery.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)) as any;
    }
    
    // Main query
    let query = db.select().from(users);
    if (whereConditions.length > 0) {
      query = query.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)) as any;
    }

    // Apply sorting
    if (sortBy === 'firstName') {
      query = (sortOrder === 'asc' ? query.orderBy(users.firstName) : query.orderBy(desc(users.firstName))) as any;
    } else if (sortBy === 'lastName') {
      query = (sortOrder === 'asc' ? query.orderBy(users.lastName) : query.orderBy(desc(users.lastName))) as any;
    } else if (sortBy === 'email') {
      query = (sortOrder === 'asc' ? query.orderBy(users.email) : query.orderBy(desc(users.email))) as any;
    } else {
      query = (sortOrder === 'asc' ? query.orderBy(users.createdAt) : query.orderBy(desc(users.createdAt))) as any;
    }

    // Apply pagination
    query = query.limit(limit).offset(offset) as any;

    // Execute queries
    const [usersResult, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      users: usersResult,
      total: totalResult[0]?.count || 0
    };
  }

  // Patient operations
  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(patientData: InsertPatient): Promise<Patient> {
    const [patient] = await db
      .insert(patients)
      .values({
        ...patientData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return patient;
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    const [patient] = await db
      .update(patients)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, id))
      .returning();
    return patient;
  }

  async deletePatient(id: string): Promise<void> {
    // Soft delete - set isActive to false instead of hard delete
    await db
      .update(patients)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(patients.id, id));
  }
  
  async hardDeletePatient(id: string): Promise<void> {
    // Hard delete - actually removes the record
    await db.delete(patients).where(eq(patients.id, id));
  }

  async getAllPatients(
    limit: number = 10, 
    offset: number = 0, 
    sortBy: string = 'createdAt', 
    sortOrder: string = 'desc'
  ): Promise<{ patients: Patient[], total: number }> {
    // Count total
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(patients);
    
    // Main query with sorting and pagination
    let query = db.select().from(patients);
    
    if (sortBy === 'name') {
      query = (sortOrder === 'asc' ? query.orderBy(patients.name) : query.orderBy(desc(patients.name))) as any;
    } else if (sortBy === 'studyDate') {
      query = (sortOrder === 'asc' ? query.orderBy(patients.studyDate) : query.orderBy(desc(patients.studyDate))) as any;
    } else {
      query = (sortOrder === 'asc' ? query.orderBy(patients.createdAt) : query.orderBy(desc(patients.createdAt))) as any;
    }

    const patientsResult = await query.limit(limit).offset(offset);

    return {
      patients: patientsResult,
      total: totalResult[0]?.count || 0
    };
  }

  async getPatientsBySpecialty(
    specialty: string,
    limit: number = 10, 
    offset: number = 0, 
    sortBy: string = 'createdAt', 
    sortOrder: string = 'desc'
  ): Promise<{ patients: Patient[], total: number }> {
    // Count total
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(patients)
      .where(eq(patients.specialty, specialty as any));
    
    // Main query with sorting and pagination
    let query = db.select().from(patients).where(eq(patients.specialty, specialty as any));
    
    if (sortBy === 'name') {
      query = (sortOrder === 'asc' ? query.orderBy(patients.name) : query.orderBy(desc(patients.name))) as any;
    } else if (sortBy === 'studyDate') {
      query = (sortOrder === 'asc' ? query.orderBy(patients.studyDate) : query.orderBy(desc(patients.studyDate))) as any;
    } else {
      query = (sortOrder === 'asc' ? query.orderBy(patients.createdAt) : query.orderBy(desc(patients.createdAt))) as any;
    }

    const patientsResult = await query.limit(limit).offset(offset);

    return {
      patients: patientsResult,
      total: totalResult[0]?.count || 0
    };
  }

  async getPatientsByDoctor(doctorId: string): Promise<Patient[]> {
    return await db
      .select()
      .from(patients)
      .where(eq(patients.doctorId, doctorId))
      .orderBy(desc(patients.createdAt));
  }

  async searchPatients(
    searchQuery: string,
    limit: number = 10, 
    offset: number = 0, 
    sortBy: string = 'createdAt', 
    sortOrder: string = 'desc'
  ): Promise<{ patients: Patient[], total: number }> {
    const searchFilter = sql`(
      lower(${patients.name}) LIKE lower(${`%${searchQuery}%`}) OR 
      lower(${patients.email}) LIKE lower(${`%${searchQuery}%`}) OR 
      lower(${patients.chiefComplaint}) LIKE lower(${`%${searchQuery}%`})
    )`;

    // Count total
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(patients)
      .where(searchFilter);
    
    // Main query with sorting and pagination
    let query = db.select().from(patients).where(searchFilter);
    
    if (sortBy === 'name') {
      query = (sortOrder === 'asc' ? query.orderBy(patients.name) : query.orderBy(desc(patients.name))) as any;
    } else if (sortBy === 'studyDate') {
      query = (sortOrder === 'asc' ? query.orderBy(patients.studyDate) : query.orderBy(desc(patients.studyDate))) as any;
    } else {
      query = (sortOrder === 'asc' ? query.orderBy(patients.createdAt) : query.orderBy(desc(patients.createdAt))) as any;
    }

    const patientsResult = await query.limit(limit).offset(offset);

    return {
      patients: patientsResult,
      total: totalResult[0]?.count || 0
    };
  }

  // Patient files operations
  async createPatientFile(fileData: InsertPatientFile): Promise<PatientFile> {
    const [file] = await db
      .insert(patientFiles)
      .values({
        ...fileData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return file;
  }

  async getPatientFiles(patientId: string): Promise<PatientFile[]> {
    return await db
      .select()
      .from(patientFiles)
      .where(eq(patientFiles.patientId, patientId))
      .orderBy(desc(patientFiles.createdAt));
  }

  async deletePatientFile(id: string): Promise<void> {
    await db.delete(patientFiles).where(eq(patientFiles.id, id));
  }

  // User permissions operations
  async createUserPermission(permissionData: InsertUserPermission): Promise<UserPermission> {
    const [permission] = await db
      .insert(userPermissions)
      .values({
        ...permissionData,
        createdAt: new Date(),
      })
      .returning();
    return permission;
  }

  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    return await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId));
  }

  async deleteUserPermissions(userId: string): Promise<void> {
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
  }

  // Notifications operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values({
        ...notificationData,
        createdAt: new Date(),
      })
      .returning();
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // Archive operations
  async archivePatient(patientId: string, archivedBy: string): Promise<PatientArchive> {
    const patient = await this.getPatient(patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const [archived] = await db
      .insert(patientArchive)
      .values({
        originalPatientId: patientId,
        patientData: patient as any,
        archivedAt: new Date(),
        archivedBy,
        archiveReason: "Periodic archive",
      })
      .returning();

    await this.hardDeletePatient(patientId);
    return archived;
  }

  // Analytics operations
  async getPatientCountBySpecialty(): Promise<Array<{ specialty: string; count: number }>> {
    const results = await db
      .select({
        specialty: patients.specialty,
        count: sql<number>`count(*)::int`,
      })
      .from(patients)
      .groupBy(patients.specialty);
    
    return results.map(r => ({ specialty: r.specialty!, count: r.count }));
  }

  async getTodayPatientCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(patients)
      .where(and(
        sql`${patients.createdAt} >= ${today}`,
        sql`${patients.createdAt} < ${tomorrow}`
      ));
    
    return result.count;
  }

  async getPendingReportsCount(): Promise<number> {
    // This would be based on some status field in a reports table
    // For now, return a placeholder
    return 7;
  }


  async findUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  return user;
}

  async getRecentActivity(): Promise<Array<{ type: string; message: string; createdAt: Date }>> {
    const recentPatients = await db
      .select({
        type: sql<string>`'patient_added'`,
        message: sql<string>`'New patient ' || ${patients.name} || ' added'`,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .orderBy(desc(patients.createdAt))
      .limit(10);
    
    return recentPatients.map(r => ({
      type: r.type,
      message: r.message,
      createdAt: r.createdAt!,
    }));
  }

  async getSEOConfig(path: string): Promise<SEOConfig | undefined> {
    try {
      const result = await db.select().from(seoConfigs).where(eq(seoConfigs.path, path));
      return result[0] || undefined;
    } catch (error) {
      console.error('Error fetching SEO config:', error);
      return undefined;
    }
  }

  async updateSEOConfig(path: string, config: Partial<SEOConfig>): Promise<void> {
    try {
      const existing = await this.getSEOConfig(path);
      if (existing) {
        await db
          .update(seoConfigs)
          .set({ ...config, updatedAt: new Date() })
          .where(eq(seoConfigs.path, path));
      } else {
        await db.insert(seoConfigs).values({ ...config, path });
      }
    } catch (error) {
      console.error('Error updating SEO config:', error);
      throw error;
    }
  }

  async getAllSEOConfigs(): Promise<SEOConfig[]> {
    try {
      return await db.select().from(seoConfigs);
    } catch (error) {
      console.error('Error fetching all SEO configs:', error);
      return [];
    }
  }

  // Patient Comments operations
  async getPatientComments(patientId: string): Promise<any[]> {
    try {
      // For now, return mock data - in a real implementation, this would use a database table
      return [
        {
          id: '1',
          content: 'Patient shows good recovery progress',
          type: 'medical',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: {
            id: 'doctor1',
            name: 'Dr. Smith',
            role: 'Doctor'
          },
          isEdited: false
        }
      ];
    } catch (error) {
      console.error('Error fetching patient comments:', error);
      return [];
    }
  }

  async addPatientComment(patientId: string, comment: any): Promise<any> {
    try {
      // For now, return the comment with an ID - in a real implementation, this would insert into database
      return {
        id: Math.random().toString(36).substr(2, 9),
        ...comment
      };
    } catch (error) {
      console.error('Error adding patient comment:', error);
      throw error;
    }
  }

  async updatePatientComment(patientId: string, commentId: string, updates: any): Promise<any> {
    try {
      // For now, return the updates - in a real implementation, this would update the database
      return {
        id: commentId,
        ...updates
      };
    } catch (error) {
      console.error('Error updating patient comment:', error);
      throw error;
    }
  }

  async deletePatientComment(patientId: string, commentId: string): Promise<boolean> {
    try {
      // For now, return true - in a real implementation, this would delete from database
      return true;
    } catch (error) {
      console.error('Error deleting patient comment:', error);
      return false;
    }
  }

  // Patient Timeline operations
  async getPatientTimeline(patientId: string): Promise<any[]> {
    try {
      // For now, return mock timeline data
      return [
        {
          id: '1',
          type: 'study',
          title: 'CT Scan Completed',
          description: 'Chest CT scan has been completed and is ready for review',
          createdAt: new Date().toISOString(),
          author: {
            id: 'tech1',
            name: 'John Tech',
            role: 'Technician'
          },
          metadata: {
            studyType: 'CT',
            status: 'completed'
          }
        },
        {
          id: '2',
          type: 'comment',
          title: 'Doctor Note Added',
          description: 'Progress note has been added to patient record',
          createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          author: {
            id: 'doctor1',
            name: 'Dr. Smith',
            role: 'Doctor'
          },
          metadata: {
            commentType: 'medical'
          }
        }
      ];
    } catch (error) {
      console.error('Error fetching patient timeline:', error);
      return [];
    }
  }

  async addTimelineEvent(patientId: string, event: any): Promise<any> {
    try {
      // For now, return the event with an ID - in a real implementation, this would insert into database
      return {
        id: Math.random().toString(36).substr(2, 9),
        ...event
      };
    } catch (error) {
      console.error('Error adding timeline event:', error);
      throw error;
    }
  }

  // Patient Studies operations
  async getPatientStudies(patientId: string): Promise<any[]> {
    try {
      // Get patient data to create study information
      const patient = await this.getPatient(patientId);
      if (!patient) {
        return [];
      }

      // Create study data from patient information
      const study = {
        id: '1',
        studyInstanceUID: `1.2.840.113619.2.5.${Date.now()}`,
        studyDate: patient.studyDate ? new Date(patient.studyDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        studyTime: patient.studyTime || new Date().toTimeString().split(' ')[0],
        studyDescription: patient.studyDesc || `${patient.modality || 'CT'} Study`,
        modalitiesInStudy: patient.modality ? [patient.modality] : ['CT'],
        numberOfSeries: 1,
        numberOfInstances: 150,
        referringPhysician: patient.refBy || 'Dr. Unknown',
        studyStatus: patient.reportStatus === 'completed' ? 'completed' : 
                     patient.reportStatus === 'reviewed' ? 'completed' : 
                     'in-progress',
        accessionNumber: patient.accession || `ACC${Date.now().toString().slice(-8)}`,
        institutionName: patient.center || 'Medical Center',
        stationName: `${patient.modality || 'CT'}01`,
        bodyPartExamined: patient.chiefComplaint?.split(' ')[0]?.toUpperCase() || 'CHEST',
        studyPriority: patient.emergency ? 'urgent' : 'routine',
        patientPosition: 'HFS',
        findings: `Study shows ${patient.chiefComplaint || 'examination of patient condition'}. ${patient.reportStatus === 'completed' ? 'Examination completed successfully.' : 'Study in progress.'}`,
        impression: `${patient.studyDesc || 'Medical imaging study'} - ${patient.reportStatus === 'completed' ? 'Study completed, findings within normal limits.' : 'Pending radiologist review.'}`,
        recommendations: patient.reportStatus === 'completed' ? 'Follow-up as clinically indicated. Continue current treatment plan.' : 'Awaiting final radiologist interpretation and report.',
        series: [
          {
            id: '1',
            seriesInstanceUID: `1.2.840.113619.2.5.${Date.now()}.1`,
            seriesNumber: 1,
            seriesDescription: `${patient.modality || 'CT'} ${patient.chiefComplaint?.split(' ')[0] || 'Series'}`,
            modality: patient.modality || 'CT',
            numberOfInstances: 150,
            seriesDate: patient.studyDate ? new Date(patient.studyDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            seriesTime: patient.studyTime || new Date().toTimeString().split(' ')[0],
            bodyPartExamined: patient.chiefComplaint?.split(' ')[0]?.toUpperCase() || 'CHEST',
            protocolName: `${patient.modality || 'CT'} ${patient.specialty} Protocol`,
            instances: Array.from({ length: 10 }, (_, i) => ({
              id: `inst_${i + 1}`,
              sopInstanceUID: `1.2.840.113619.2.5.${Date.now()}.1.${i + 1}`,
              instanceNumber: i + 1,
              imageType: 'ORIGINAL\\PRIMARY',
              acquisitionDate: patient.studyDate ? new Date(patient.studyDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              acquisitionTime: patient.studyTime || new Date().toTimeString().split(' ')[0],
              sliceThickness: 1.25,
              sliceLocation: i * 1.25,
              thumbnailUrl: undefined
            }))
          }
        ]
      };

      return [study];
    } catch (error) {
      console.error('Error fetching patient studies:', error);
      return [];
    }
  }

  // Enhanced file storage
  async storePatientFile(patientId: string, fileData: any): Promise<string> {
    try {
      // For now, return a mock object ID - in a real implementation, this would use the actual object storage
      const objectId = Math.random().toString(36).substr(2, 9);
      
      // Also create a patient file record
      const patientFile: InsertPatientFile = {
        id: fileData.fileId,
        patientId,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        uploadedBy: fileData.uploadedBy,
        uploadedAt: new Date(fileData.uploadedAt),
        metadata: JSON.stringify({
          type: fileData.type,
          title: fileData.title,
          notes: fileData.notes,
          objectId
        })
      };
      
      await this.createPatientFile(patientFile);
      return objectId;
    } catch (error) {
      console.error('Error storing patient file:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
