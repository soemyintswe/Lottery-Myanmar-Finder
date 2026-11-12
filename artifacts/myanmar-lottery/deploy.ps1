Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "Building Expo web..." -ForegroundColor Cyan
pnpm exec expo export --platform web

if (-not $env:FIREBASE_TOKEN) {
  throw "FIREBASE_TOKEN is required for Firebase Hosting deploy."
}

Write-Host "Deploying to Firebase Hosting..." -ForegroundColor Cyan
pnpm exec firebase deploy --only hosting:mkslottery --token "$env:FIREBASE_TOKEN" --project mks-myanmarlottery

Write-Host "Deployed: https://mkslottery.web.app" -ForegroundColor Green
