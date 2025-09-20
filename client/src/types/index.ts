export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  username: string | null;
  phone: string | null;
  address: string | null;
  role: "super_admin" | "admin" | "user" | null;
  specialty: "radiology" | "pediatric" | "gynac" | "medicines" | "surgeon" | null;
  isActive: boolean | null;
  emailNotifications: boolean | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  ipAddress: string | null;
}

export interface Patient {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  specialty: "radiology" | "pediatric" | "gynac" | "medicines" | "surgeon";
  chiefComplaint: string | null;
  medicalHistory: string | null;
  doctorId: string | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  ipAddress: string | null;
}

export interface PatientFile {
  id: string;
  patientId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  ipAddress: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalPatients: number;
  todayPatients: number;
  pendingReports: number;
  appointments: number;
}

export interface SpecialtyData {
  specialty: string;
  count: number;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  patientName?: string;
  doctorName?: string;
}