$response = Invoke-WebRequest -Uri 'http://localhost:5000/api/login' -Method Post -ContentType 'application/json' -Body (ConvertTo-Json @{email='admin@myclinic.com'; password='admin123'})
$responseObject = $response.Content | ConvertFrom-Json
$token = $responseObject.token
Write-Host "JWT Token obtained successfully"

# Test accessing one of the existing files
$headers = @{
    'Authorization' = "Bearer $token"
}

# Test the first existing file: 8f246806-971d-4fef-8067-21378ade7c07
Write-Host "Testing file access..."
try {
    $fileResponse = Invoke-WebRequest -Uri 'http://localhost:5000/api/objects/local-upload/8f246806-971d-4fef-8067-21378ade7c07' -Headers $headers -Method Head
    Write-Host "✅ File access successful! Status: $($fileResponse.StatusCode)"
    Write-Host "Content-Type: $($fileResponse.Headers['Content-Type'])"
    Write-Host "Content-Length: $($fileResponse.Headers['Content-Length'])"
} catch {
    Write-Host "❌ File access failed: $($_.Exception.Message)"
}

# Test the old API endpoint that was causing 401 errors
Write-Host "Testing old API endpoint..."
try {
    $oldApiResponse = Invoke-WebRequest -Uri 'http://localhost:5000/api/upload/8f246806-971d-4fef-8067-21378ade7c07' -Headers $headers -Method Head
    Write-Host "✅ Old API endpoint access successful! Status: $($oldApiResponse.StatusCode)"
} catch {
    Write-Host "❌ Old API endpoint failed: $($_.Exception.Message)"
}