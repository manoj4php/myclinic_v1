import { db } from './server/db.js';
import { patientFiles } from './shared/schema.js';

async function checkFiles() {
  try {
    console.log('Connecting to database...');
    const files = await db.select().from(patientFiles);
    console.log(`Found ${files.length} files in database:`);
    console.log('');
    
    files.forEach(file => {
      console.log(`- ID: ${file.id}`);
      console.log(`  File Name: ${file.fileName}`);
      console.log(`  File Path: ${file.filePath}`);
      console.log(`  Patient ID: ${file.patientId}`);
      console.log(`  Created: ${file.createdAt}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error checking files:', error);
  }
  process.exit(0);
}

checkFiles();