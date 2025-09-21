# ClinicConnect Development Commands & Operations Documentation

This document contains all the commands, operations, and troubleshooting steps used during the development and maintenance of the ClinicConnect medical application.

## Table of Contents
- [Database Operations](#database-operations)
- [File Management & Storage](#file-management--storage)
- [DICOM Viewer Operations](#dicom-viewer-operations)
- [Server Management](#server-management)
- [Package Management](#package-management)
- [Development Workflow](#development-workflow)
- [Troubleshooting Commands](#troubleshooting-commands)

---

## Database Operations

### Local PostgreSQL Setup
```powershell
# Check database configuration
cat .env | grep DB_

# Push database schema to local PostgreSQL
npm run db:push

# Check database connection and verify schema
npx drizzle-kit push
```

### Database Inspection Commands
```typescript
// Create database inspection script (check-local-db.ts)
import { db } from "./server/db";
import { patients, patientFiles } from "./shared/schema";

async function checkLocalDatabase() {
  try {
    console.log("Checking local database connection...");
    
    // Check patients
    const allPatients = await db.select().from(patients);
    console.log(`Found ${allPatients.length} patients in local database:`);
    allPatients.forEach(patient => {
      console.log(`- Patient: ${patient.id} - ${patient.name}`);
    });
    
    // Check patient files
    const allFiles = await db.select().from(patientFiles);
    console.log(`\nFound ${allFiles.length} files in local database:`);
    allFiles.forEach(file => {
      console.log(`- File: ${file.id} - ${file.fileName} (Patient: ${file.patientId})`);
    });
  } catch (error) {
    console.error("Database error:", error);
  } finally {
    process.exit(0);
  }
}

checkLocalDatabase();
```

```powershell
# Execute database check
npx tsx check-local-db.ts
```

### Patient File Management
```typescript
// Create file details inspection script (check-files.ts)
import { db } from "./server/db";
import { patientFiles } from "./shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function checkFileDetails() {
  try {
    const files = await db.select().from(patientFiles).where(
      eq(patientFiles.patientId, "PATIENT_ID_HERE")
    );
    
    files.forEach(file => {
      console.log(`\nFile Details:`);
      console.log(`- ID: ${file.id}`);
      console.log(`- Filename: ${file.fileName}`);
      console.log(`- FilePath: ${file.filePath}`);
      console.log(`- FileType: ${file.fileType}`);
      console.log(`- FileSize: ${file.fileSize}`);
      
      // Check if file exists in storage
      const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "storage/private";
      const uploadDir = path.join(process.cwd(), privateObjectDir, "uploads");
      const actualFilePath = path.join(uploadDir, file.filePath);
      
      console.log(`- Expected path: ${actualFilePath}`);
      console.log(`- File exists: ${fs.existsSync(actualFilePath)}`);
    });
  } catch (error) {
    console.error("Error:", error);
  }
}
```

### Database Fix Operations
```typescript
// Fix patient file records script (fix-patient-files.ts)
import { db } from "./server/db";
import { patientFiles } from "./shared/schema";
import { eq } from "drizzle-orm";

async function fixPatientFiles() {
  try {
    const patientId = "PATIENT_ID_HERE";
    
    // Get current file records
    const currentFiles = await db.select().from(patientFiles).where(
      eq(patientFiles.patientId, patientId)
    );
    
    // Update file records
    for (let i = 0; i < currentFiles.length; i++) {
      const fileRecord = currentFiles[i];
      const newFilePath = "NEW_FILE_PATH_HERE";
      
      await db.update(patientFiles)
        .set({ 
          filePath: newFilePath,
          fileSize: FILE_SIZE_HERE
        })
        .where(eq(patientFiles.id, fileRecord.id));
    }
    
    console.log("File records updated successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}
```

---

## File Management & Storage

### Storage Directory Operations
```powershell
# Navigate to uploads directory
cd storage/private/uploads

# List all files with details
Get-ChildItem | Select-Object Name, Length, LastWriteTime | Sort-Object LastWriteTime -Descending

# List files by extension (e.g., DICOM files)
Get-ChildItem | Where-Object {$_.Extension -match '\.(dcm|DCM|dicom)$'} | Select-Object Name, Length, LastWriteTime | Sort-Object LastWriteTime -Descending

# Find files by pattern
Get-ChildItem | Where-Object {$_.Name -like "*PATTERN*"}

# Check file existence
Test-Path "filename.ext"

# Get file details
Get-ItemProperty "filename.ext" | Select-Object Name, Length, LastWriteTime

# Return to project root
cd ..\..\..\
```

### File Cleanup Operations
```powershell
# Remove temporary files
Remove-Item check-local-db.ts, check-files.ts, fix-patient-files.ts

# Remove specific file patterns
Remove-Item *.temp

# Remove directories
Remove-Item -Recurse -Force temp_directory
```

---

## DICOM Viewer Operations

### DICOM File Management
```powershell
# List DICOM files by size and date
Get-ChildItem storage/private/uploads | Where-Object {$_.Extension -match '\.(dcm|DCM|dicom)$'} | Select-Object Name, Length, LastWriteTime | Sort-Object LastWriteTime -Descending | Select-Object -First 20

# Find large DICOM files (>1MB)
Get-ChildItem storage/private/uploads | Where-Object {$_.Extension -match '\.(dcm|DCM|dicom)$' -and $_.Length -gt 1MB}

# Check DICOM file integrity
Get-ChildItem storage/private/uploads | Where-Object {$_.Extension -match '\.(dcm|DCM|dicom)$'} | ForEach-Object { 
    Write-Host "$($_.Name) - $($_.Length) bytes" 
}
```

### DICOM Viewer Component Analysis
```bash
# Search for DICOM-related code
grep -r "DICOM\|cornerstone\|dcm" client/src/components/
grep -r "DICOMViewer" client/src/pages/

# Check DICOM file detection logic
grep -r "isDICOMFile\|\.dcm\|\.dicom" client/src/
```

---

## Server Management

### Development Server Operations
```powershell
# Start development server
npm run dev

# Stop all Node.js processes (if port conflicts occur)
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*tsx*"} | Stop-Process -Force

# Check server status
curl http://localhost:5000/api/health

# Monitor server logs
Get-Content logs/server.log -Wait

# Check port usage
netstat -an | findstr ":5000"
```

### Environment Configuration
```powershell
# Check environment variables
Get-Content .env

# Validate required environment variables
$requiredVars = @("DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET")
$requiredVars | ForEach-Object {
    $value = (Get-Content .env | Where-Object {$_ -match "^$_="})
    if ($value) {
        Write-Host "$_: SET" -ForegroundColor Green
    } else {
        Write-Host "$_: MISSING" -ForegroundColor Red
    }
}
```

---

## Package Management

### Dependency Management
```powershell
# Install dependencies
npm install

# Update dependencies
npm update

# Remove specific package (e.g., Neon database)
npm uninstall @neondatabase/serverless

# Check for security vulnerabilities
npm audit

# Fix security issues
npm audit fix

# Clean npm cache
npm cache clean --force

# Reinstall node_modules
Remove-Item -Recurse -Force node_modules
npm install
```

### Package Information
```powershell
# List installed packages
npm list

# Check package versions
npm list --depth=0

# Check outdated packages
npm outdated

# View package information
npm info PACKAGE_NAME
```

---

## Development Workflow

### Code Quality & Linting
```powershell
# Type checking
npm run check

# Build project
npm run build

# Run tests (if available)
npm test

# Format code (if prettier is configured)
npx prettier --write .

# Lint code (if eslint is configured)
npx eslint . --fix
```

### Git Operations
```powershell
# Check git status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to repository
git push origin main

# Check git log
git log --oneline -10

# Check differences
git diff
```

### File Search & Analysis
```powershell
# Search for text in files
Select-String -Path "**/*.ts" -Pattern "SEARCH_TERM"
Select-String -Path "**/*.tsx" -Pattern "SEARCH_TERM"

# Find files by name pattern
Get-ChildItem -Recurse -Filter "*.ts" | Where-Object {$_.Name -like "*PATTERN*"}

# Count lines of code
Get-ChildItem -Recurse -Include "*.ts","*.tsx","*.js","*.jsx" | Get-Content | Measure-Object -Line
```

---

## Troubleshooting Commands

### Common Issues & Solutions

#### Port Already in Use
```powershell
# Find process using port 5000
netstat -ano | findstr ":5000"

# Kill specific process by PID
taskkill /PID PROCESS_ID /F

# Kill all Node.js processes
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

#### Database Connection Issues
```powershell
# Test PostgreSQL connection
psql -h localhost -p 5432 -U postgres -d postgres

# Check PostgreSQL service status
Get-Service | Where-Object {$_.Name -like "*postgresql*"}

# Start PostgreSQL service
Start-Service postgresql-x64-13  # Adjust service name as needed
```

#### File Permission Issues
```powershell
# Check file permissions
icacls "filename.ext"

# Grant full permissions (if needed)
icacls "storage" /grant Everyone:F /T

# Take ownership of files
takeown /F "storage" /R
```

#### Memory & Performance
```powershell
# Check system memory
Get-ComputerInfo | Select-Object TotalPhysicalMemory, AvailablePhysicalMemory

# Monitor Node.js memory usage
Get-Process node | Select-Object ProcessName, WS, CPU

# Clear temporary files
Remove-Item $env:TEMP\* -Recurse -Force -ErrorAction SilentlyContinue
```

---

## API Testing Commands

### cURL Commands for API Testing
```powershell
# Test patient API
curl "http://localhost:5000/api/patients" -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test specific patient
curl "http://localhost:5000/api/patients/PATIENT_ID" -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test file endpoint
curl "http://localhost:5000/api/files/FILENAME.dcm" -H "Authorization: Bearer YOUR_JWT_TOKEN" -o downloaded_file.dcm

# Test patient files
curl "http://localhost:5000/api/patients/PATIENT_ID/files" -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### PowerShell API Testing
```powershell
# Test API with Invoke-RestMethod
$headers = @{ "Authorization" = "Bearer YOUR_JWT_TOKEN" }
Invoke-RestMethod -Uri "http://localhost:5000/api/patients" -Headers $headers

# Download file
Invoke-WebRequest -Uri "http://localhost:5000/api/files/FILENAME.dcm" -Headers $headers -OutFile "downloaded_file.dcm"
```

---

## Utility Scripts

### Quick Database Check Script
```typescript
// quick-db-check.ts
import { db } from "./server/db";
import { patients, patientFiles } from "./shared/schema";

async function quickCheck() {
  const patientCount = (await db.select().from(patients)).length;
  const fileCount = (await db.select().from(patientFiles)).length;
  console.log(`Database Status: ${patientCount} patients, ${fileCount} files`);
  process.exit(0);
}
quickCheck();
```

### File Sync Verification Script
```typescript
// verify-file-sync.ts
import { db } from "./server/db";
import { patientFiles } from "./shared/schema";
import * as fs from "fs";
import * as path from "path";

async function verifyFileSync() {
  const files = await db.select().from(patientFiles);
  const uploadDir = path.join(process.cwd(), "storage/private/uploads");
  
  let missingFiles = 0;
  files.forEach(file => {
    const filePath = path.join(uploadDir, file.filePath);
    if (!fs.existsSync(filePath)) {
      console.log(`Missing: ${file.filePath}`);
      missingFiles++;
    }
  });
  
  console.log(`Verification complete: ${missingFiles} missing files out of ${files.length} total`);
  process.exit(0);
}
verifyFileSync();
```

---

## Notes

- Always backup your database before running fix scripts
- Test commands in a development environment first
- Keep environment variables secure and never commit them to version control
- Regular database backups are recommended
- Monitor file storage usage and clean up orphaned files periodically

---

*Generated on: September 22, 2025*
*Project: ClinicConnect Medical Application*
*Environment: Windows PowerShell + Node.js + PostgreSQL*