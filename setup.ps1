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

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install express nodemailer smtp-server sqlite3 express-session passport passport-local connect-flash

# Create basic template files if they don't exist
if (!(Test-Path "views/login.ejs")) {
    mkdir -Force views
    
    $loginTemplate = @"
<!DOCTYPE html>
<html>
<head>
    <title>Login</title>
</head>
<body>
    <h2>Login</h2>
    <% if (message) { %>
        <div style="color: red;"><%= message %></div>
    <% } %>
    <form method="post" action="/login">
        <p>
            <label>Username:</label><br>
            <input type="text" name="username" required>
        </p>
        <p>
            <label>Password:</label><br>
            <input type="password" name="password" required>
        </p>
        <p>
            <button type="submit">Login</button>
        </p>
    </form>
</body>
</html>
"@
    
    $loginTemplate | Out-File -FilePath "