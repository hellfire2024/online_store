#!/usr/bin/env pwsh

Write-Output "=== COMPREHENSIVE STARTUP AND DIAGNOSTIC SCRIPT ===" | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
Write-Output "Time: $(Get-Date)" | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
Write-Output "" | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append

# Kill all node processes
Write-Output "[1/5] Killing existing node processes..." | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
taskkill /F /IM node.exe /IM node20.exe 2>&1 | Where-Object { $_ -notmatch "No processes found" } | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
Start-Sleep -Seconds 2

# Start Backend
Write-Output "[2/5] Starting backend (port 3001)..." | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
cd c:\Temp\online_store
Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Hidden -RedirectStandardOutput "c:\Temp\online_store\backend.log" -RedirectStandardError "c:\Temp\online_store\backend-err.log"
Start-Sleep -Seconds 4

# Start Frontend
Write-Output "[3/5] Starting frontend (port 5175)..." | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
cd c:\Temp\online_store\frontend
Start-Process -FilePath "npm" -ArgumentList "run", "preview", "--", "--host", "127.0.0.1", "--port", "5175" -WindowStyle Hidden -RedirectStandardOutput "c:\Temp\online_store\frontend.log" -RedirectStandardError "c:\Temp\online_store\frontend-err.log"
Start-Sleep -Seconds 3

# Test Backend
Write-Output "[4/5] Testing backend health..." | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing -TimeoutSec 5
    Write-Output "✓ Backend Health: $($resp.StatusCode) - $($resp.Content)" | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
}
catch {
    Write-Output "✗ Backend Error: $($_.Exception.Message)" | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
}

# Test Frontend
Write-Output "[5/5] Testing frontend..." | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
try {
    $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:5175/' -UseBasicParsing -TimeoutSec 5
    Write-Output "✓ Frontend: $($resp.StatusCode) - HTML length: $($resp.Content.Length) bytes" | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
}
catch {
    Write-Output "✗ Frontend Error: $($_.Exception.Message)" | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
}

Write-Output "" | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
Write-Output "=== STARTUP COMPLETE ===" | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
Write-Output "Backend log: c:\Temp\online_store\backend.log" | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
Write-Output "Frontend log: c:\Temp\online_store\frontend.log" | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
Write-Output "Full log: c:\Temp\online_store\startup-log.txt" | Tee-Object -FilePath c:\Temp\online_store\startup-log.txt -Append
