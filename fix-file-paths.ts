import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { patientFiles } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function fixFilePaths() {
  const sql = postgres(process.env.DATABASE_URL || '');
  const db = drizzle(sql);

  try {
    // Fix the MRBRAIN.DCM file that should point to 48c3e876-4abe-4182-bc03-4f5eb8dc3473.DCM
    const result1 = await db.update(patientFiles)
      .set({ filePath: '48c3e876-4abe-4182-bc03-4f5eb8dc3473.DCM' })
      .where(eq(patientFiles.filePath, 'c410a8a3-b64f-4e8e-be32-4e96b2c8fdc3.DCM'));
    
    console.log(`Updated MRBRAIN.DCM file path`);
    
    // Fix the IMG-0002-00001.dcm file that should point to 3dd95cdf-613b-4cf1-a9e2-2f7763bc8ebc.dcm
    const result2 = await db.update(patientFiles)
      .set({ filePath: '3dd95cdf-613b-4cf1-a9e2-2f7763bc8ebc.dcm' })
      .where(eq(patientFiles.filePath, '1443713a-f2a1-44e6-a4da-a636198200d1.dcm'));
    
    console.log(`Updated IMG-0002-00001.dcm file path`);
    
    // Verify the updates
    const files = await db.select().from(patientFiles)
      .where(eq(patientFiles.fileName, 'MRBRAIN.DCM'))
      .limit(5);
    
    console.log('Updated MRBRAIN.DCM file entries:');
    files.forEach(file => {
      console.log(`- ${file.fileName} -> ${file.filePath}`);
    });
    
    console.log('File path fix completed!');
    
  } catch (error) {
    console.error('Error fixing file paths:', error);
  } finally {
    await sql.end();
  }
}

// Run the fix
fixFilePaths().catch(console.error);