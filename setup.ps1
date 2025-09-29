 Also add a check for Node.js installation, and also add the missing `bcrypt` package to the list of installed packages.

The final result should be:
# Email Bounce Handler Setup Script
# This script creates required directories and installs dependencies

Write-Host "Setting up Email Bounce Handler..." -ForegroundColor Green

# Create required directories
mkdir -Force data, public, views, src

# Check if Node.js is available
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is available
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npm is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install express nodemailer smtp-server sqlite3 bcrypt express-session passport passport-local

# Verify installation
if ($LASTEXITCODE -eq 0) {
    Write-Host "Setup completed successfully!" -ForegroundColor Green
    Write-Host "Directories created: data, public, views, src" -ForegroundColor Green
    Write-Host "Dependencies installed: express, nodemailer, smtp-server, sqlite3, bcrypt, express-session, passport, passport-local" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the application:" -ForegroundColor Cyan
    Write-Host "  npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "For development with auto-restart:" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor White
} else {
    Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
