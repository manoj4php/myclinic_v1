import fs from 'fs';
import path from 'path';

const files = [
  '8f246806-971d-4fef-8067-21378ade7c07',
  '9641e2e4-30f5-4ad1-9c07-c1e88089d344', 
  '20770870-df4d-4a17-b1e8-317a59ec2de1',
  '5361b0b8-7b55-4091-a7b6-9b22494c4cb3',
  '1a29d849-b0a3-4396-b1c8-28eed3a6bcc8',
  '300b4603-b0e8-47b5-b3b9-af2445d07ab6',
  '2ab63923-0be2-4779-a634-9e943232d026'
];

const uploadDir = 'c:/Users/rahul/Downloads/ClinicConnect/github/storage/private/uploads';

console.log('Checking file existence:');
console.log('');

files.forEach(fileName => {
  const filePath = path.join(uploadDir, fileName);
  const exists = fs.existsSync(filePath);
  console.log(`${fileName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
  
  if (exists) {
    const stats = fs.statSync(filePath);
    console.log(`  Size: ${stats.size} bytes`);
    console.log(`  Modified: ${stats.mtime}`);
  }
  console.log('');
});