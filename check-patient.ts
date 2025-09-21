import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { patients, patientFiles } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function checkPatient() {
  const pool = new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "clinic_connect",
    password: process.env.DB_PASSWORD || "postgres",
    port: Number(process.env.DB_PORT) || 5432,
  });
  
  const db = drizzle(pool);
  
  try {
    const patient = await db.select().from(patients).where(eq(patients.id, '656f7434'));
    console.log('Patient found:', patient);
    
    const patientFilesData = await db.select().from(patientFiles).where(eq(patientFiles.patientId, '656f7434'));
    console.log('Patient files:', patientFilesData);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkPatient();