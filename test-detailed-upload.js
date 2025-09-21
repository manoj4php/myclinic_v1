// Detailed test of upload flow to identify the filePath mismatch issue
async function testDetailedUploadFlow() {
  try {
    console.log('🔐 Step 1: Logging in...');
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@myclinic.com', password: 'admin123' })
    });
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    console.log('\n📤 Step 2: Getting upload URL...');
    const uploadUrlResponse = await fetch('http://localhost:5000/api/objects/upload', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      }
    });
    const uploadUrlData = await uploadUrlResponse.json();
    console.log('✅ Upload URL obtained:', uploadUrlData);

    console.log('\n📁 Step 3: Uploading file with detailed logging...');
    const testFileContent = Buffer.from('DICM\x00\x08\x00\x00UL\x04\x00\x00\x00\x00\x01\x00\x00'); // Fake DICOM header
    const uploadResponse = await fetch(uploadUrlData.uploadURL, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/dicom',
        'X-File-Name': 'test-scan-detailed.dcm' // This should be preserved
      },
      body: testFileContent
    });
    const uploadResult = await uploadResponse.json();
    console.log('✅ File upload result:', uploadResult);

    // Check which URL format is returned
    console.log('\n🔍 Step 4: Analyzing upload result...');
    console.log('- uploadId:', uploadResult.uploadId);
    console.log('- filePath (storage):', uploadResult.filePath);
    console.log('- fileUrl (access):', uploadResult.fileUrl);
    console.log('- uploadURL (for Uppy):', uploadResult.uploadURL);

    console.log('\n🏥 Step 5: Creating patient file entry...');
    const fileURLToUse = uploadResult.uploadURL || uploadResult.fileUrl || uploadUrlData.uploadURL;
    console.log('Using fileURL:', fileURLToUse);
    
    const patientFileResponse = await fetch('http://localhost:5000/api/patient-files', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patientId: 'patient-1',
        fileName: 'test-scan-detailed.dcm', // Original filename
        fileURL: fileURLToUse
      })
    });
    
    if (!patientFileResponse.ok) {
      const errorText = await patientFileResponse.text();
      console.log('❌ Patient file creation failed:', patientFileResponse.status, errorText);
      return;
    }
    
    const patientFileResult = await patientFileResponse.json();
    console.log('✅ Patient file created:', patientFileResult);

    console.log('\n🔍 Step 6: Verifying file access...');
    // Test if the file is accessible through the URL that was stored
    const testAccessResponse = await fetch(fileURLToUse, {
      method: 'HEAD',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('File access test:', testAccessResponse.status, testAccessResponse.statusText);

    console.log('\n📋 Step 7: Checking database state...');
    const filesResponse = await fetch('http://localhost:5000/api/patients/patient-1/files', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const files = await filesResponse.json();
    console.log('Current patient files:', files.length);
    files.forEach((file, i) => {
      console.log(`${i+1}. ${file.fileName} -> ${file.filePath}`);
    });

  } catch (error) {
    console.error('❌ Detailed test failed:', error);
  }
}

testDetailedUploadFlow();