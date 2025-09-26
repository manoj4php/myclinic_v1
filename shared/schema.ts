import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  serial,
  integer,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum("role", ["super_admin", "doctor", "technician"]);
export const specialtyEnum = pgEnum("specialty", ["radiology", "pediatric", "gynac", "medicines", "surgeon"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const permissionEnum = pgEnum("permission", ["add", "edit", "delete", "view"]);

// Session storage table (Required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (Required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"), // Added back password field
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(),
  phone: varchar("phone"),
  address: text("address"),
  role: roleEnum("role").default("technician"),
  specialty: specialtyEnum("specialty"),
  isActive: boolean("is_active").default(true),
  emailNotifications: boolean("email_notifications").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  ipAddress: varchar("ip_address"),
});

// Patients table
export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone").notNull(),
  address: text("address"),
  dateOfBirth: timestamp("date_of_birth"), // Made nullable since we're using age field now
  age: integer("age"),
  gender: genderEnum("gender").notNull(),
  specialty: specialtyEnum("specialty").notNull(),
  chiefComplaint: text("chief_complaint"),
  medicalHistory: text("medical_history"),
  doctorId: varchar("doctor_id").references(() => users.id),
  // New fields for the updated requirements
  emergency: boolean("emergency").default(false),
  reportStatus: varchar("report_status").default("pending"), // pending, completed, reviewed
  studyDate: timestamp("study_date").defaultNow(), // date and time when study was created
  studyTime: varchar("study_time"), // time portion of study (for display purposes)
  accession: varchar("accession"), // accession number
  studyDesc: text("study_desc"), // study description
  modality: varchar("modality"), // CT, MRI, X-Ray, etc.
  center: varchar("center"), // medical center/facility
  refBy: varchar("ref_by"), // referred by doctor
  isPrinted: boolean("is_printed").default(false),
  reportedBy: varchar("reported_by").references(() => users.id), // doctor who reported
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  ipAddress: varchar("ip_address"),
});

// Patient Files table
export const patientFiles = pgTable("patient_files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: integer("file_size"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  ipAddress: varchar("ip_address"),
});

// User Permissions table
export const userPermissions = pgTable("user_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  resource: varchar("resource").notNull(), // patients, users, reports, etc.
  permission: permissionEnum("permission").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"),
  ipAddress: varchar("ip_address"),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // patient_added, patient_updated, etc.
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  relatedId: varchar("related_id"), // patient_id, user_id, etc.
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"),
  ipAddress: varchar("ip_address"),
});

// Patient Archive table (for configurable archival)
export const patientArchive = pgTable("patient_archive", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  originalPatientId: uuid("original_patient_id").notNull(),
  patientData: jsonb("patient_data").notNull(),
  archivedAt: timestamp("archived_at").defaultNow(),
  archivedBy: varchar("archived_by"),
  archiveReason: varchar("archive_reason"),
  ipAddress: varchar("ip_address"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  patients: many(patients),
  patientFiles: many(patientFiles),
  permissions: many(userPermissions),
  notifications: many(notifications),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  doctor: one(users, {
    fields: [patients.doctorId],
    references: [users.id],
  }),
  reportedByUser: one(users, {
    fields: [patients.reportedBy],
    references: [users.id],
  }),
  files: many(patientFiles),
}));

export const patientFilesRelations = relations(patientFiles, ({ one }) => ({
  patient: one(patients, {
    fields: [patientFiles.patientId],
    references: [patients.id],
  }),
  uploadedByUser: one(users, {
    fields: [patientFiles.uploadedBy],
    references: [users.id],
  }),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dateOfBirth: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]).optional(),
  age: z.number().min(0, "Age must be 0 or greater").max(120, "Age must be 120 or less").optional(),
  studyDate: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]).optional()
});

export const insertPatientFileSchema = createInsertSchema(patientFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type PatientFile = typeof patientFiles.$inferSelect;
export type InsertPatientFile = z.infer<typeof insertPatientFileSchema>;

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type PatientArchive = typeof patientArchive.$inferSelect;

export const seoConfigs = pgTable('seo_configs', {
  id: serial('id').primaryKey(),
  path: varchar('path', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  canonicalUrl: varchar('canonical_url', { length: 512 }),
  ogTitle: varchar('og_title', { length: 255 }),
  ogDescription: text('og_description'),
  ogImage: varchar('og_image', { length: 512 }),
  ogUrl: varchar('og_url', { length: 512 }),
  twitterCard: varchar('twitter_card', { length: 50 }),
  twitterCreator: varchar('twitter_creator', { length: 255 }),
  twitterSite: varchar('twitter_site', { length: 255 }),
  twitterImage: varchar('twitter_image', { length: 512 }),
  noIndex: boolean('no_index').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type SEOConfig = typeof seoConfigs.$inferSelect;
export type InsertSEOConfig = typeof seoConfigs.$inferInsert;
