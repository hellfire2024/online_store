Write-Host "=== Zoho Mail API Endpoint Testing ===" -ForegroundColor Cyan

$clientId = Read-Host "Enter Zoho Client ID"
$clientSecret = Read-Host "Enter Zoho Client Secret" -AsSecureString
$clientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret))
$refreshToken = Read-Host "Enter Zoho Refresh Token"
$accountId = Read-Host "Enter Zoho Account ID"
$fromEmail = Read-Host "Enter from email"
$testEmail = Read-Host "Enter test recipient email"

Write-Host "`nGetting access token..." -ForegroundColor Yellow
try {
    $tokenResponse = Invoke-RestMethod -Method Post -Uri 'https://accounts.zoho.com/oauth/v2/token' -Body @{
        client_id = $clientId
        client_secret = $clientSecretPlain
        refresh_token = $refreshToken
        grant_type = 'refresh_token'
    }
    $accessToken = $tokenResponse.access_token
    Write-Host "Access token obtained" -ForegroundColor Green
}
catch {
    Write-Host "Failed to get access token" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

$headers = @{
    'Authorization' = "Bearer $accessToken"
    'Content-Type' = 'application/json'
}

Write-Host "`nTesting GET endpoints..." -ForegroundColor Yellow

$urls = @(
    "https://mail.zoho.com/api/accounts/$accountId",
    "https://mail.zoho.com/api/accounts/$accountId/folders"
)

foreach ($url in $urls) {
    Write-Host "GET $url" -ForegroundColor Cyan
    try {
        $result = Invoke-RestMethod -Uri $url -Headers $headers
        Write-Host "  SUCCESS" -ForegroundColor Green
    }
    catch {
        Write-Host "  Failed: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

Write-Host "`nTesting POST endpoints..." -ForegroundColor Yellow

$emailPayload = @{
    fromAddress = $fromEmail
    toAddress = $testEmail
    subject = "Test Email"
    content = "This is a test"
} | ConvertTo-Json

$postUrls = @(
    "https://mail.zoho.com/api/accounts/$accountId/messages",
    "https://mail.zoho.com/api/accounts/$accountId/messages/send",
    "https://mail.zoho.com/api/accounts/$accountId/sendmail"
)

foreach ($url in $postUrls) {
    Write-Host "POST $url" -ForegroundColor Cyan
    try {
        $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Post -Body $emailPayload
        Write-Host "  SUCCESS - Email sent!" -ForegroundColor Green
        Write-Host "  Use this endpoint: $url" -ForegroundColor Yellow
    }
    catch {
        Write-Host "  Failed: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

Write-Host "`nDone!" -ForegroundColor Green
