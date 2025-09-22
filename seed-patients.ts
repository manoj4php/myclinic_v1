import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { patients } from './shared/schema.js';
import { nanoid } from 'nanoid';

async function seedPatients() {
  const sql = postgres(process.env.DATABASE_URL || '');
  const db = drizzle(sql);

  const samplePatients = [];
  const firstNames = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Maria',
    'William', 'Jennifer', 'Charles', 'Linda', 'Thomas', 'Patricia', 'Christopher', 'Susan',
    'Daniel', 'Jessica', 'Matthew', 'Karen', 'Anthony', 'Nancy', 'Mark', 'Betty', 'Donald',
    'Helen', 'Steven', 'Sandra', 'Paul', 'Donna', 'Andrew', 'Carol', 'Kenneth', 'Ruth',
    'Joshua', 'Sharon', 'Kevin', 'Michelle', 'Brian', 'Laura', 'George', 'Sarah', 'Edward',
    'Kimberly', 'Ronald', 'Deborah', 'Timothy', 'Dorothy', 'Jason', 'Amy', 'Jeffrey', 'Angela'
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez',
    'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
    'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez',
    'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright',
    'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker',
    'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
  ];

  const specialties = ['radiology', 'pediatric', 'gynac', 'medicines', 'surgeon'];
  const genders = ['male', 'female', 'other'];
  const modalities = ['CT', 'MRI', 'X-Ray', 'Ultrasound', 'PET', 'Nuclear Medicine'];
  const centers = ['Main Hospital', 'North Clinic', 'South Medical Center', 'West Wing', 'Emergency Department'];
  
  const complaints = [
    'Chest pain', 'Abdominal pain', 'Headache', 'Back pain', 'Knee injury', 'Shoulder pain',
    'Shortness of breath', 'Fever', 'Fatigue', 'Nausea', 'Dizziness', 'Joint pain',
    'Muscle pain', 'Respiratory issues', 'Cardiac symptoms', 'Neurological symptoms'
  ];

  const reportingDoctors = [
    'Dr. Anderson', 'Dr. Brown', 'Dr. Clark', 'Dr. Davis', 'Dr. Evans', 'Dr. Foster',
    'Dr. Garcia', 'Dr. Hill', 'Dr. Johnson', 'Dr. King', 'Dr. Lee', 'Dr. Martinez',
    'Dr. Nelson', 'Dr. Patel', 'Dr. Roberts', 'Dr. Smith', 'Dr. Taylor', 'Dr. Wilson'
  ];

  // Generate 100 sample patients
  for (let i = 1; i <= 100; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const specialty = specialties[Math.floor(Math.random() * specialties.length)];
    const modality = modalities[Math.floor(Math.random() * modalities.length)];
    const center = centers[Math.floor(Math.random() * centers.length)];
    const complaint = complaints[Math.floor(Math.random() * complaints.length)];
    const reportedBy = reportingDoctors[Math.floor(Math.random() * reportingDoctors.length)];
    
    // Generate realistic dates (past 2 years)
    const randomDate = new Date();
    randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 730)); // Random date in past 2 years
    
    // Generate birth date (18-90 years old)
    const birthDate = new Date();
    const ageInYears = 18 + Math.floor(Math.random() * 72); // Age between 18-90
    birthDate.setFullYear(birthDate.getFullYear() - ageInYears);
    
    const isEmergency = Math.random() < 0.15; // 15% emergency cases
    const phoneNumber = `+1-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`;
    
    samplePatients.push({
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
      phone: phoneNumber,
      address: `${Math.floor(Math.random() * 9999 + 1)} ${['Main St', 'Oak Ave', 'Pine Rd', 'First Ave', 'Second St'][Math.floor(Math.random() * 5)]}, City, State ${Math.floor(Math.random() * 99999 + 10000)}`,
      dateOfBirth: birthDate,
      gender: gender as 'male' | 'female' | 'other',
      specialty: specialty as 'radiology' | 'pediatric' | 'gynac' | 'medicines' | 'surgeon',
      chiefComplaint: complaint,
      medicalHistory: `Previous history of ${complaint.toLowerCase()}. Patient reports ${['mild', 'moderate', 'severe'][Math.floor(Math.random() * 3)]} symptoms.`,
      emergency: isEmergency,
      reportStatus: ['pending', 'completed', 'reviewed'][Math.floor(Math.random() * 3)] as string,
      studyDate: randomDate,
      studyTime: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      accession: `ACC${Date.now()}${i}`,
      studyDesc: `${modality} study of ${['chest', 'abdomen', 'head', 'pelvis', 'spine', 'extremity'][Math.floor(Math.random() * 6)]}`,
      modality: modality,
      center: center,
      refBy: `Dr. ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
      isPrinted: Math.random() < 0.3, // 30% printed
      reportedBy: reportedBy,
      isActive: true,
      createdAt: randomDate,
      updatedAt: randomDate,
      createdBy: 'system-seed',
      ipAddress: '127.0.0.1'
    });
  }

  try {
    console.log('Inserting 100 sample patients...');
    
    // Insert patients in batches of 10 to avoid overwhelming the database
    for (let i = 0; i < samplePatients.length; i += 10) {
      const batch = samplePatients.slice(i, i + 10);
      await db.insert(patients).values(batch);
      console.log(`Inserted patients ${i + 1} to ${Math.min(i + 10, samplePatients.length)}`);
    }
    
    console.log('Successfully inserted 100 sample patients!');
    
    // Query to verify
    const count = await db.select().from(patients);
    console.log(`Total patients in database: ${count.length}`);
    
  } catch (error) {
    console.error('Error inserting sample patients:', error);
  } finally {
    await sql.end();
  }
}

// Run the seeding function
seedPatients().catch(console.error);