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

async function checkFileConsistency() {
  console.log('🔍 Checking file consistency between database and storage...');
  
  try {
    // Get all files from database
    const allFiles = await db.select().from(schema.patientFiles);
    console.log(`\n📋 Found ${allFiles.length} files in database:`);
    
    const filesToDelete = [];
    
    allFiles.forEach((file, index) => {
      console.log(`\n${index + 1}. File ID: ${file.id}`);
      console.log(`   File Name: ${file.fileName}`);
      console.log(`   File Path: ${file.filePath}`);
      console.log(`   File Type: ${file.fileType}`);
      
      // The uploadId seems to be stored in filePath for some files
      // Check multiple possible storage locations
      let fileExists = false;
      let actualPath = '';
      
      // Try different path patterns
      const possiblePaths = [
        path.join(storageDir, file.filePath), // Direct path
        path.join(storageDir, file.fileName), // Using fileName as ID
        path.join(storageDir, file.id),       // Using the actual ID
      ];
      
      // Also check if filePath might be just the uploadId
      if (file.filePath && !file.filePath.includes('/')) {
        possiblePaths.push(path.join(storageDir, file.filePath));
      }
      
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          fileExists = true;
          actualPath = testPath;
          break;
        }
      }
      
      if (fileExists) {
        const stats = fs.statSync(actualPath);
        console.log(`   ✅ EXISTS: ${actualPath} (${Math.round(stats.size / 1024)} KB)`);
      } else {
        console.log(`   ❌ MISSING: Not found in any expected location`);
        filesToDelete.push(file.id);
      }
    });
    
    if (filesToDelete.length > 0) {
      console.log(`\n🧹 Found ${filesToDelete.length} files to clean up:`);
      filesToDelete.forEach(id => console.log(`   - ${id}`));
      
      console.log('\n⚠️  To clean up these files, run: DELETE FROM patient_files WHERE id IN (...)');
    } else {
      console.log('\n✅ All database files have corresponding storage files!');
    }
    
  } catch (error) {
    console.error('❌ Error checking file consistency:', error);
  } finally {
    await pool.end();
  }
}

checkFileConsistency();