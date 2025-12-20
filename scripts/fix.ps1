# scripts/fix.ps1
$ErrorActionPreference = "Stop"

Write-Host "--- 🐍 Fixing Backend (Ruff) ---" -ForegroundColor Cyan
cd api
pipenv run ruff check --fix .
pipenv run ruff format .
cd ..

Write-Host "--- ⚛️ Fixing Frontend (Prettier & Lint) ---" -ForegroundColor Cyan
cd ui
bun run format
bun run lint --fix
cd ..

Write-Host "--- ✨ Codebase Fixed! ---" -ForegroundColor Green
