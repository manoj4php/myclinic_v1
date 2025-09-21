import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./shared/schema.js";
import { like, inArray } from "drizzle-orm";
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

async function cleanupBadUploads() {
  console.log('🧹 Cleaning up bad upload entries...');
  
  try {
    // Find files where fileName is a UUID (these are the broken uploads)
    const badFiles = await db.select()
      .from(schema.patientFiles)
      .where(like(schema.patientFiles.fileName, '%-%-%-%-%'));
    
    console.log(`\n📋 Found ${badFiles.length} bad upload entries:`);
    badFiles.forEach((file, index) => {
      console.log(`${index + 1}. ID: ${file.id}`);
      console.log(`   Bad fileName: ${file.fileName}`);
      console.log(`   FilePath: ${file.filePath}`);
    });
    
    if (badFiles.length > 0) {
      // Delete the bad entries
      const badIds = badFiles.map(f => f.id);
      const result = await db.delete(schema.patientFiles)
        .where(inArray(schema.patientFiles.id, badIds));
      
      console.log(`\n✅ Removed ${result.rowCount} bad upload entries`);
    }
    
    // Show remaining files
    const remainingFiles = await db.select().from(schema.patientFiles);
    console.log(`\n📋 ${remainingFiles.length} clean files remaining:`);
    remainingFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.fileName} -> ${file.filePath}`);
    });
    
  } catch (error) {
    console.error('❌ Error cleaning up bad uploads:', error);
  } finally {
    await pool.end();
  }
}

cleanupBadUploads();