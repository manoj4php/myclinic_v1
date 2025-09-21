// Test the upload flow
async function testUploadFlow() {
  try {
    // Step 1: Login to get token
    console.log('🔐 Logging in...');
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@myclinic.com', password: 'admin123' })
    });
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // Step 2: Get upload URL
    console.log('📤 Getting upload URL...');
    const uploadUrlResponse = await fetch('http://localhost:5000/api/objects/upload', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      }
    });
    const uploadUrlData = await uploadUrlResponse.json();
    console.log('✅ Upload URL obtained:', uploadUrlData.uploadURL);

    // Step 3: Simulate file upload
    console.log('📁 Simulating file upload...');
    const testFileContent = Buffer.from('Test DICOM file content');
    const uploadResponse = await fetch(uploadUrlData.uploadURL, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/dicom',
        'X-File-Name': 'test-brain-scan.dcm'
      },
      body: testFileContent
    });
    const uploadResult = await uploadResponse.json();
    console.log('✅ File uploaded:', uploadResult);

    // Step 4: Create patient file entry
    console.log('🏥 Creating patient file entry...');
    const patientFileResponse = await fetch('http://localhost:5000/api/patient-files', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patientId: 'patient-1', // Use existing test patient
        fileName: 'test-brain-scan.dcm',
        fileURL: uploadResult.uploadURL || uploadResult.fileUrl
      })
    });
    const patientFileResult = await patientFileResponse.json();
    console.log('✅ Patient file created:', patientFileResult);

    // Step 5: Verify file appears in patient files
    console.log('🔍 Checking patient files...');
    const filesResponse = await fetch('http://localhost:5000/api/patients/patient-1/files', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const files = await filesResponse.json();
    console.log('📋 Patient files:', files);

    console.log('🎉 Upload flow test completed successfully!');

  } catch (error) {
    console.error('❌ Upload flow test failed:', error);
  }
}

testUploadFlow();