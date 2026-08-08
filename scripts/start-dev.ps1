$ErrorActionPreference = 'SilentlyContinue'
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

while ($true) {
    $portBusy = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
    if (-not $portBusy) {
        & npm run dev *>> "vite-persistent.log"
    }
    Start-Sleep -Seconds 3
}
