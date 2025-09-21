// Test script to understand the upload URL generation
const response = await fetch('http://localhost:5000/api/objects/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log('Upload URL generated:', data);

// This would be used in the uppy upload, but let's see what URL format we get