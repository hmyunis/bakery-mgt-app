# scripts/check.ps1
$ErrorActionPreference = "Continue"
$HasErrors = $false

function Run-Check {
    param([scriptblock]$Script)
    & $Script
    if ($LASTEXITCODE -ne 0) {
        $global:HasErrors = $true
    }
}

Write-Host "--- 🐍 Checking Backend (Ruff) ---" -ForegroundColor Cyan
cd api
Run-Check { pipenv run ruff check . }
Run-Check { pipenv run ruff format --check . }
cd ..

Write-Host "--- ⚛️ Checking Frontend (TS & Lint) ---" -ForegroundColor Cyan
cd ui
Write-Host "Running Type Check..."
Run-Check { bun run tsc --noEmit }
Write-Host "Running ESLint..."
Run-Check { bun run lint }
cd ..
Write-Host "Running Localization Audit..."
Run-Check { node scripts/localize-ui.cjs --check }

if ($HasErrors) {
    Write-Host "--- ❌ Checks Failed! Please fix the issues above. ---" -ForegroundColor Red
    exit 1
} else {
    Write-Host "--- ✅ All Checks Passed! ---" -ForegroundColor Green
    exit 0
}


