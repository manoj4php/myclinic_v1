import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./shared/schema.js";
import { inArray } from "drizzle-orm";
import fs from 'fs';
import path from 'path';
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "clinic_connect",
});

const db = drizzle(pool, { schema });

const storageDir = './storage/private/uploads';

// List of files that don't exist in storage
const missingFiles = [
  '5361b0b8-7b55-4091-a7b6-9b22494c4cb3',
  '1a29d849-b0a3-4396-b1c8-28eed3a6bcc8', 
  '300b4603-b0e8-47b5-b3b9-af2445d07ab6',
  '2ab63923-0be2-4779-a634-9e943232d026',
  '4f950707-b11b-4eee-a610-7bf084b0e3a9' // Add the file from the current error
];

async function cleanupStaleFiles() {
  console.log('🧹 Cleaning up stale file references...');
  
  try {
    // First, let's check what files are currently in the database
    const allFiles = await db.select().from(schema.patientFiles);
    console.log('\n📋 All files in database before cleanup:');
    allFiles.forEach(file => {
      console.log(`${file.uploadId} - ${file.fileName} (${file.fileType})`);
      if (file.uploadId) {
        const filePath = path.join(storageDir, file.uploadId);
        const exists = fs.existsSync(filePath);
        console.log(`  ${exists ? '✅' : '❌'} File exists: ${exists}`);
      }
    });

    // Delete database entries for missing files
    const result = await db.delete(schema.patientFiles)
      .where(inArray(schema.patientFiles.uploadId, missingFiles));
    
    console.log(`\n✅ Removed ${result.rowCount} stale file references from database`);
    
    // List remaining files
    const remainingFiles = await db.select().from(schema.patientFiles);
    console.log('\n📋 Remaining files in database after cleanup:');
    remainingFiles.forEach(file => {
      console.log(`${file.uploadId} - ${file.fileName} (${file.fileType})`);
      if (file.uploadId) {
        const filePath = path.join(storageDir, file.uploadId);
        const exists = fs.existsSync(filePath);
        console.log(`  ${exists ? '✅' : '❌'} File exists: ${exists}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error cleaning up files:', error);
  } finally {
    await pool.end();
  }
}

cleanupStaleFiles();