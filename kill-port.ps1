# PowerShell script to kill process on port 3000
Write-Host "Finding process on port 3000..." -ForegroundColor Yellow

$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "Found process ID: $process" -ForegroundColor Green
    Stop-Process -Id $process -Force
    Write-Host "Process killed successfully!" -ForegroundColor Green
} else {
    Write-Host "No process found on port 3000" -ForegroundColor Yellow
}
