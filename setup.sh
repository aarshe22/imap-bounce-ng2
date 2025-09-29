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
npm install express nodemailer smtp-server imap-simple sqlite3 bcrypt express-session passport passport-local

# Verify installation
if [ $? -eq 0 ]; then
    echo "Setup completed successfully!"
    echo "Directories created: data, public, views, src"
    echo "Dependencies installed: express, nodemailer, smtp-server, imap-simple, sqlite3, bcrypt, express-session, passport, passport-local"
    echo ""
    echo "To start the application:"
    echo "  npm start"
    echo ""
    echo "For development with auto-restart:"
    echo "  npm run dev"
else
    echo "Error: Failed to install dependencies"
    exit 1
fi