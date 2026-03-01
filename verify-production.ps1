# Verify Production Deployment Script
Write-Host "🔍 Checking Production Deployment Status..." -ForegroundColor Cyan
Write-Host ""

# Check health endpoint
Write-Host "1. Checking health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri 'https://devapi.adaptivegis.com/health' -UseBasicParsing
    Write-Host "   ✅ Health: $($health.status)" -ForegroundColor Green
    
    if ($health.PSObject.Properties.Name -contains 'demo_mode') {
        if ($health.demo_mode -eq $false) {
            Write-Host "   ✅ DEMO_MODE: false (correct!)" -ForegroundColor Green
        }
        else {
            Write-Host "   ❌ DEMO_MODE: $($health.demo_mode) (should be false)" -ForegroundColor Red
        }
    }
    else {
        Write-Host "   ❌ demo_mode field missing (OLD CODE DEPLOYED)" -ForegroundColor Red
        Write-Host "   → Backend needs redeployment with latest commits" -ForegroundColor Yellow
    }
    
    Write-Host "   ✅ DB Connected: $($health.db_connected)" -ForegroundColor Green
    Write-Host "   Node: $($health.node_version)" -ForegroundColor Gray
}
catch {
    Write-Host "   ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Testing /api/customers endpoint..." -ForegroundColor Yellow
try {
    $customers = Invoke-RestMethod -Uri 'https://devapi.adaptivegis.com/api/customers' -UseBasicParsing
    Write-Host "   ✅ GET /api/customers: Success" -ForegroundColor Green
    Write-Host "   Customers count: $($customers.Count)" -ForegroundColor Gray
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    Write-Host "   ❌ GET /api/customers: $statusCode" -ForegroundColor Red
    if ($statusCode -eq 404) {
        Write-Host "   → DEMO_MODE bug still present (routes not registered)" -ForegroundColor Yellow
    }
    elseif ($statusCode -eq 500) {
        Write-Host "   → Database query error or old code" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "3. Testing /api/products endpoint..." -ForegroundColor Yellow
try {
    $products = Invoke-RestMethod -Uri 'https://devapi.adaptivegis.com/api/products' -UseBasicParsing
    Write-Host "   ✅ GET /api/products: Success" -ForegroundColor Green
    Write-Host "   Products count: $($products.Count)" -ForegroundColor Gray
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    Write-Host "   ❌ GET /api/products: $statusCode" -ForegroundColor Red
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Expected after successful deployment:" -ForegroundColor Cyan
Write-Host "  - Health endpoint shows demo_mode: false" -ForegroundColor White
Write-Host "  - GET /api/customers returns 200 OK" -ForegroundColor White
Write-Host "  - GET /api/products returns 200 OK" -ForegroundColor White
Write-Host "=" * 60 -ForegroundColor Cyan
