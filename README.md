# Email Bounce Handler

A complete Node.js email bounce handler that functions as both an SMTP server (listening on port 25) and a specialized bounce processor with IMAP support.

## Features

- **SMTP Server**: Listens on port 25 for incoming emails
- **IMAP Support**: Full IMAP protocol implementation for client connections
- **Bounce Detection**: Identifies bounce messages using keywords and SMTP error codes
- **Notification System**: Sends human-readable notifications based on configuration
- **Folder Organization**: Processes messages into INBOX, PROCESSED, SKIPPED, PROBLEM folders
- **Web Interface**: Admin panel with full configuration management
- **Test Mode**: Routes notifications but doesn't move messages in INBOX

## Requirements

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

### Automatic Setup

Run the setup script to create directories and install dependencies:

```bash
npm run setup
```

### Manual Installation

1. Create required directories:
   ```bash
   mkdir -p data public views
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Start the application:

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

## Configuration

The web interface is accessible at `http://localhost:3000` and provides:
- Login authentication (default admin user)
- Settings management for test mode and IMAP configuration
- Mailbox management
- Activity log viewing
- Bounce message tracking

## Folder Structure

```
.
├── data/                 # Database storage
├── public/               # Static assets (CSS, JS, images)
├── src/                  # Source code
│   └── server.js         # Main application
├── views/                # EJS templates for web interface
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## Security

- User authentication against local mailbox database
- Passwords are securely hashed using bcrypt
- Proper error handling to prevent information leakage
- Secure storage of credentials in database
- Support for SSL/TLS connections

## License

MIT