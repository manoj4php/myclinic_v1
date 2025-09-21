import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { patients, files } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function checkPatient() {
  const sql = postgres(process.env.DATABASE_URL || '');
  const db = drizzle(sql);
  
  try {
    const patient = await db.select().from(patients).where(eq(patients.id, '656f7434'));
    console.log('Patient found:', patient);
    
    const patientFiles = await db.select().from(files).where(eq(files.patientId, '656f7434'));
    console.log('Patient files:', patientFiles);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkPatient();