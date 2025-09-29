 The `imap-server` dependency has been replaced with `imap-simple`. Please also make sure that the `package.json` file is created automatically, and include the start and dev scripts in it.

# Email Bounce Handler Setup Script
# This script creates required directories and installs dependencies

Write-Host "Setting up Email Bounce Handler..." -ForegroundColor Green

# Create required directories
mkdir -Force data, public, views, src

# Check if npm is available
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npm is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Create package.json with start and dev scripts
$packageJson = @{
    name = "email-bounce-handler"
    version = "1.0.0"
    description = "Email Bounce Handler for managing bounced emails"
    main = "src/server.js"
    scripts = @{
        start = "node src/server.js"
        dev = "nodemon src/server.js"
    }
    dependencies = @{
        express = "^4.18.2"
        nodemailer = "^6.9.4"
        "imap-simple" = "^4.8.1"
        sqlite3 = "^5.1.6"
        bcrypt = "^5.1.0"
        "express-session" = "^1.17.3"
        passport = "^0.6.0"
        "passport-local" = "^1.0.0"
    }
    keywords = @("email", "bounce", "handler")
    author = "Your Name"
    license = "MIT"
}

# Convert to JSON and write to file
$packageJson | ConvertTo-Json | Out-File -FilePath "package.json" -Encoding UTF8

Write-Host "Created package.json file" -ForegroundColor Green

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install express nodemailer imap-simple sqlite3 bcrypt express-session passport passport-local

# Verify installation
if ($LASTEXITCODE -eq 0) {
    Write-Host "Setup completed successfully!" -ForegroundColor Green
    Write-Host "Directories created: data, public, views, src" -ForegroundColor Green
    Write-Host "Dependencies installed: express, nodemailer, imap-simple, sqlite3, bcrypt, express-session, passport, passport-local" -ForegroundColor Green
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