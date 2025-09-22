import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcryptjs";

interface DoctorData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  specialty: "radiology" | "pediatric" | "gynac" | "medicines" | "surgeon";
}

const doctorsData: DoctorData[] = [
  {
    username: "dr.smith",
    email: "dr.smith@clinicconnect.com",
    firstName: "John",
    lastName: "Smith",
    phone: "+1-555-0101",
    address: "123 Medical Plaza, Suite 101",
    specialty: "radiology"
  },
  {
    username: "dr.johnson",
    email: "dr.johnson@clinicconnect.com",
    firstName: "Sarah",
    lastName: "Johnson",
    phone: "+1-555-0102",
    address: "456 Health Center Dr, Suite 205",
    specialty: "pediatric"
  },
  {
    username: "dr.williams",
    email: "dr.williams@clinicconnect.com",
    firstName: "Michael",
    lastName: "Williams",
    phone: "+1-555-0103",
    address: "789 Care Avenue, Floor 3",
    specialty: "gynac"
  },
  {
    username: "dr.brown",
    email: "dr.brown@clinicconnect.com",
    firstName: "Emily",
    lastName: "Brown",
    phone: "+1-555-0104",
    address: "321 Wellness Blvd, Suite 150",
    specialty: "medicines"
  },
  {
    username: "dr.davis",
    email: "dr.davis@clinicconnect.com",
    firstName: "Robert",
    lastName: "Davis",
    phone: "+1-555-0105",
    address: "654 Hospital Road, Building A",
    specialty: "surgeon"
  },
  {
    username: "dr.wilson",
    email: "dr.wilson@clinicconnect.com",
    firstName: "Jennifer",
    lastName: "Wilson",
    phone: "+1-555-0106",
    address: "987 Medical Way, Suite 300",
    specialty: "radiology"
  },
  {
    username: "dr.garcia",
    email: "dr.garcia@clinicconnect.com",
    firstName: "Carlos",
    lastName: "Garcia",
    phone: "+1-555-0107",
    address: "147 Clinic Street, Floor 2",
    specialty: "pediatric"
  },
  {
    username: "dr.martinez",
    email: "dr.martinez@clinicconnect.com",
    firstName: "Maria",
    lastName: "Martinez",
    phone: "+1-555-0108",
    address: "258 Healthcare Drive, Suite 400",
    specialty: "gynac"
  },
  {
    username: "dr.anderson",
    email: "dr.anderson@clinicconnect.com",
    firstName: "David",
    lastName: "Anderson",
    phone: "+1-555-0109",
    address: "369 Medicine Lane, Building B",
    specialty: "medicines"
  },
  {
    username: "dr.taylor",
    email: "dr.taylor@clinicconnect.com",
    firstName: "Lisa",
    lastName: "Taylor",
    phone: "+1-555-0110",
    address: "741 Surgery Center, Suite 500",
    specialty: "surgeon"
  }
];

async function seedDoctors() {
  try {
    console.log("🏥 Starting to seed doctor users...");
    
    const hashedPassword = await bcrypt.hash("welcome123", 10);
    console.log("🔐 Password hashed successfully");

    for (const doctorData of doctorsData) {
      try {
        console.log(`👨‍⚕️ Creating doctor: ${doctorData.firstName} ${doctorData.lastName} (${doctorData.email})`);
        
        const newUser = await db.insert(users).values({
          username: doctorData.username,
          email: doctorData.email,
          firstName: doctorData.firstName,
          lastName: doctorData.lastName,
          phone: doctorData.phone,
          address: doctorData.address,
          specialty: doctorData.specialty,
          role: "user", // Doctor role
          isActive: true,
          emailNotifications: true,
          password: hashedPassword, // Use 'password' instead of 'hashedPassword'
          createdBy: "system",
          updatedBy: "system",
          ipAddress: "127.0.0.1",
        }).returning();

        console.log(`✅ Successfully created doctor: ${newUser[0].email} with ID: ${newUser[0].id}`);
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⚠️  Doctor ${doctorData.email} already exists, skipping...`);
        } else {
          console.error(`❌ Error creating doctor ${doctorData.email}:`, error.message);
        }
      }
    }

    console.log("🎉 Doctor seeding completed!");
    console.log("\n📋 Login Credentials for Testing:");
    console.log("Password for all doctors: welcome123");
    console.log("\nEmail addresses:");
    doctorsData.forEach((doctor, index) => {
      console.log(`${index + 1}. ${doctor.email} (${doctor.firstName} ${doctor.lastName} - ${doctor.specialty})`);
    });

  } catch (error) {
    console.error("❌ Error during doctor seeding:", error);
  } finally {
    process.exit(0);
  }
}

// Run the seeding function
seedDoctors();