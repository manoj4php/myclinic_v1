import { storage } from "./server/storage.js";
import * as fs from "fs";
import * as path from "path";

async function cleanStaleFileEntries() {
  try {
    console.log("🔍 Checking for stale file entries...");
    
    // Get all patients
    const patients = await storage.getAllPatients();
    console.log(`Found ${patients.length} patients`);
    
    const uploadDir = "storage/private/uploads";
    const absoluteUploadDir = path.resolve(uploadDir);
    
    console.log(`Upload directory: ${absoluteUploadDir}`);
    
    // Get all files in storage
    let storageFiles = [];
    try {
      storageFiles = fs.readdirSync(absoluteUploadDir);
      console.log(`Found ${storageFiles.length} files in storage`);
    } catch (error) {
      console.error(`Error reading storage directory: ${error}`);
      return;
    }
    
    let totalProcessed = 0;
    let staleEntriesFound = 0;
    let staleEntriesRemoved = 0;
    
    for (const patient of patients) {
      const patientFiles = await storage.getPatientFiles(patient.id);
      console.log(`\n👤 Patient ${patient.firstName} ${patient.lastName} (${patient.id}): ${patientFiles.length} files`);
      
      for (const file of patientFiles) {
        totalProcessed++;
        console.log(`  📄 File: ${file.fileName} -> ${file.filePath}`);
        
        // Check if the file exists in storage
        let fileExists = false;
        
        // Direct match
        if (storageFiles.includes(file.filePath)) {
          fileExists = true;
          console.log(`    ✅ Found exact match: ${file.filePath}`);
        } else {
          // Try to find by UUID prefix (for files without extension in DB)
          const matchingFiles = storageFiles.filter(storageFile => 
            storageFile.startsWith(file.filePath) || file.filePath.startsWith(storageFile.split('.')[0])
          );
          
          if (matchingFiles.length > 0) {
            console.log(`    🔄 Found potential matches: ${matchingFiles.join(', ')}`);
            
            // If we found a match with extension, update the database entry
            const bestMatch = matchingFiles.find(f => f.includes('.')) || matchingFiles[0];
            if (bestMatch !== file.filePath) {
              console.log(`    🔧 Should update database filePath from "${file.filePath}" to "${bestMatch}"`);
              
              // Update the file path in database (we'll implement this update later)
              // For now, just log what needs to be updated
            }
            fileExists = true;
          } else {
            console.log(`    ❌ File not found in storage`);
            staleEntriesFound++;
            
            // This is a stale entry - remove it
            console.log(`    🗑️  Removing stale database entry for file: ${file.fileName}`);
            try {
              await storage.deletePatientFile(file.id);
              staleEntriesRemoved++;
              console.log(`    ✅ Removed stale entry`);
            } catch (error) {
              console.log(`    ❌ Error removing stale entry: ${error}`);
            }
          }
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`Total files processed: ${totalProcessed}`);
    console.log(`Stale entries found: ${staleEntriesFound}`);
    console.log(`Stale entries removed: ${staleEntriesRemoved}`);
    
  } catch (error) {
    console.error("Error cleaning stale file entries:", error);
  }
}

cleanStaleFileEntries().then(() => {
  console.log("✅ Cleanup completed");
  process.exit(0);
}).catch((error) => {
  console.error("❌ Cleanup failed:", error);
  process.exit(1);
});