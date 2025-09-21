import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./shared/schema.js";
import { inArray } from "drizzle-orm";
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

// IDs of files that don't exist in storage (from the consistency check)
const staleFileIds = [
  '890feb61-ea9a-4eb4-9fa8-ffb6ffd62c6b', // e1aa0244-813b-46f3-bdfe-c530b6231cd5
  '4f13b070-e4be-454f-8f79-c9c9376b6f47'  // MRBRAIN.DCM -> c70d1da6-3513-4dfe-a647-a8b7fbc7469a
];

async function cleanupNewStaleFiles() {
  console.log('🧹 Cleaning up new stale file references...');
  
  try {
    // Show what we're about to delete
    const filesToDelete = await db.select()
      .from(schema.patientFiles)
      .where(inArray(schema.patientFiles.id, staleFileIds));
    
    console.log(`\n📋 Found ${filesToDelete.length} stale files to delete:`);
    filesToDelete.forEach((file, index) => {
      console.log(`${index + 1}. ID: ${file.id}`);
      console.log(`   Name: ${file.fileName}`);
      console.log(`   Path: ${file.filePath}`);
    });
    
    // Delete the stale entries
    const result = await db.delete(schema.patientFiles)
      .where(inArray(schema.patientFiles.id, staleFileIds));
    
    console.log(`\n✅ Successfully removed ${result.rowCount} stale file references from database`);
    
    // List remaining files
    const remainingFiles = await db.select().from(schema.patientFiles);
    console.log(`\n📋 ${remainingFiles.length} files remaining in database:`);
    remainingFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.fileName} -> ${file.filePath}`);
    });
    
  } catch (error) {
    console.error('❌ Error cleaning up files:', error);
  } finally {
    await pool.end();
  }
}

cleanupNewStaleFiles();