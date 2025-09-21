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

// IDs of files that don't exist in storage (from previous analysis)
const staleFileIds = [
  'c44c99ac-e4bf-4953-8562-5986d548b88d', // 5361b0b8-7b55-4091-a7b6-9b22494c4cb3
  '9e62a55c-f957-480c-837e-fd91443410c4', // 1a29d849-b0a3-4396-b1c8-28eed3a6bcc8
  '5ea11c52-a076-4b8d-a774-3b9bd7138098', // 300b4603-b0e8-47b5-b3b9-af2445d07ab6
  'da9bfd57-e13b-4f93-866a-02f33408a543', // 2ab63923-0be2-4779-a634-9e943232d026
  'ed43d27a-ccc6-4dae-84af-193626731a2f', // 2992e74e-31e6-448a-9788-7eca78521e09
  '60fe7cca-e7c4-40d8-87c7-1dd4a7f1c095', // 05f4fa0c-7a70-45d2-8630-4c07a51e40fd
  'cd1adf30-cf6e-4063-aa62-1f6727381c0c'  // 4f950707-b11b-4eee-a610-7bf084b0e3a9 (the problematic one)
];

async function cleanupStaleFiles() {
  console.log('🧹 Cleaning up stale file references from database...');
  
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
    
    // Verify cleanup - show remaining files
    const remainingFiles = await db.select().from(schema.patientFiles);
    console.log(`\n📋 ${remainingFiles.length} files remaining in database:`);
    remainingFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.fileName} (${file.fileType})`);
    });
    
  } catch (error) {
    console.error('❌ Error cleaning up files:', error);
  } finally {
    await pool.end();
  }
}

cleanupStaleFiles();