#!/bin/bash

# Email Bounce Handler Setup Script
# This script creates required directories and installs dependencies

echo "Setting up Email Bounce Handler..."

# Create required directories
mkdir -p data public views src

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install express nodemailer smtp-server sqlite3 express-session passport passport-local connect-flash

# Create basic template files if they don't exist
if [ ! -f "views/login.ejs" ]; then
    mkdir -p views
    cat > views/login.ejs << 'EOF'
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
EOF
fi

echo "Setup completed successfully!"
echo "To start the application, run: npm start"