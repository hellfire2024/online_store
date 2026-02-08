# Zoho Mail API Connection Diagnostics Script (PowerShell)
# Run this to test your Zoho Mail API connectivity and credentials
# Usage: powershell -ExecutionPolicy Bypass -File ZOHO_DIAGNOSTICS.ps1

param(
    [string]$ClientId = "",
    [string]$ClientSecret = "",
    [string]$AccountId = ""
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Zoho Mail API Diagnostics" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Prompt for credentials if not provided
if ([string]::IsNullOrEmpty($ClientId)) {
    $ClientId = Read-Host "Enter Zoho Client ID (e.g., 1000.xxxx)"
}

if ([string]::IsNullOrEmpty($ClientSecret)) {
    $ClientSecret = Read-Host "Enter Zoho Client Secret"
}

if ([string]::IsNullOrEmpty($AccountId)) {
    $AccountId = Read-Host "Enter Zoho Account ID (numeric)"
}

# Validate input
if ([string]::IsNullOrEmpty($ClientId) -or [string]::IsNullOrEmpty($ClientSecret) -or [string]::IsNullOrEmpty($AccountId)) {
    Write-Host "Missing credentials" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Testing connectivity to Zoho API..." -ForegroundColor Yellow
Write-Host ""

# Test 1: Can we reach Zoho's servers?
Write-Host "1️⃣  Testing DNS resolution for accounts.zoho.com..." -ForegroundColor Cyan

try {
    $dnsResult = Resolve-DnsName -Name "accounts.zoho.com" -ErrorAction Stop
    Write-Host "✅ DNS resolves successfully" -ForegroundColor Green
    Write-Host "   IP: $($dnsResult.IPAddress | Select-Object -First 1)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Cannot resolve accounts.zoho.com - check your internet connection" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2️⃣  Testing OAuth token endpoint..." -ForegroundColor Cyan

# Test 2: Try to get an access token
try {
    $tokenUri = "https://accounts.zoho.com/oauth/v2/token"
    $tokenBody = @{
        client_id = $ClientId
        client_secret = $ClientSecret
        grant_type = "client_credentials"
        scope = "ZohoMail.message.ALL"
    }

    $tokenResponse = Invoke-RestMethod -Uri $tokenUri -Method Post -Body $tokenBody -ErrorAction Stop

    if ($tokenResponse.access_token) {
        Write-Host "✅ Successfully obtained access token" -ForegroundColor Green
        $accessToken = $tokenResponse.access_token
        
        Write-Host ""
        Write-Host "3️⃣  Testing Zoho Mail API account endpoint..." -ForegroundColor Cyan
        
        # Test 3: Verify the account
        $accountUri = "https://mail.zoho.com/api/accounts/$AccountId"
        $accountResponse = Invoke-RestMethod -Uri $accountUri -Method Get `
            -Headers @{ Authorization = "Bearer $accessToken" } -ErrorAction Stop
        
        if ($accountResponse.accountId) {
            Write-Host "✅ Account validation successful!" -ForegroundColor Green
            Write-Host "   Account ID: $($accountResponse.accountId)" -ForegroundColor Gray
            Write-Host "   Name: $($accountResponse.accountName)" -ForegroundColor Gray
            
            Write-Host ""
            Write-Host "=====================================" -ForegroundColor Green
            Write-Host "✅ All diagnostics passed!" -ForegroundColor Green
            Write-Host "=====================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Your Zoho credentials are valid and configured correctly." -ForegroundColor Green
        } else {
            Write-Host "❌ Account validation failed" -ForegroundColor Red
            Write-Host "Response: $($accountResponse | ConvertTo-Json)" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Failed to get access token" -ForegroundColor Red
        Write-Host "Response: $($tokenResponse | ConvertTo-Json)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "This usually means:" -ForegroundColor Yellow
        Write-Host "  • Client ID or Secret is incorrect" -ForegroundColor Yellow
        Write-Host "  • Extra spaces in credentials when copying" -ForegroundColor Yellow
        Write-Host "  • Using outdated credentials" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    
    if ($_.Exception.Message -like "*401*") {
        Write-Host "  • 401 Unauthorized: Check your Client ID and Secret" -ForegroundColor Yellow
    } elseif ($_.Exception.Message -like "*timeout*") {
        Write-Host "  • Timeout: Check your internet connection" -ForegroundColor Yellow
    } elseif ($_.Exception.Message -like "*not found*") {
        Write-Host "  • Not Found: Check the Zoho endpoint URL" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Full error details:" -ForegroundColor Gray
    Write-Host $_ -ForegroundColor Gray
}
