# Quick Production Status Check
try {
    $health = Invoke-RestMethod -Uri 'https://devapi.adaptivegis.com/health' -UseBasicParsing
    Write-Host "Health: $($health.status)" -ForegroundColor Green
    
    if ($health.PSObject.Properties.Name -contains 'demo_mode') {
        Write-Host "✅ Latest code deployed!" -ForegroundColor Green
        Write-Host "demo_mode: $($health.demo_mode)" -ForegroundColor $(if ($health.demo_mode -eq $false) { 'Green' } else { 'Red' })
    } else {
        Write-Host "❌ Old code still running - redeploy needed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
