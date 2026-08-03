$ErrorActionPreference = 'SilentlyContinue'
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

$portBusy = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($portBusy) {
    exit 0
}

& npm run dev *> "vite-persistent.log"
