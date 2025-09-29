const express = require('express');
const nodemailer = require('nodemailer');
const smtpServer = require('smtp-server');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');

// Create directories if they don't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const dbPath = path.join(dataDir, 'bounce_handler.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  // Mailboxes table
  db.run(`CREATE TABLE IF NOT EXISTS mailboxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Activity log table
  db.run(`CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT
  )`);

  // Settings table
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_mode BOOLEAN DEFAULT 0,
    test_email TEXT,
    imap_host TEXT,
    imap_port INTEGER,
    imap_secure BOOLEAN DEFAULT 1,
    imap_username TEXT,
    imap_password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Bounce messages table
  db.run(`CREATE TABLE IF NOT EXISTS bounce_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT,
    from_address TEXT,
    to_address TEXT,
    subject TEXT,
    bounce_type TEXT,
    reason TEXT,
    processed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert default settings if not exists
  db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
    if (!row) {
      db.run(`INSERT INTO settings (id, test_mode, test_email, imap_host, imap_port, imap_secure, imap_username, imap_password)
        VALUES (1, 0, '', '', 993, 1, '', '')`);
    }
  });
});

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'bounce_handler_secret_key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration - simplified to avoid bcrypt dependency
passport.use(new LocalStrategy(
  (username, password, done) => {
    // For demonstration purposes only - in production, this should verify against DB
    if (username === 'admin' && password === 'password') {
      return done(null, { id: 1, username: 'admin' });
    }
    return done(null, false, { message: 'Incorrect username or password.' });
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // For demonstration purposes only
  done(null, { id: 1, username: 'admin' });
});

// Middleware for authentication
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

// Routes
app.get('/', ensureAuthenticated, (req, res) => {
  res.redirect('/dashboard');
});

app.get('/login', (req, res) => {
  res.render('login.ejs', { message: req.flash('error') });
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login'
}));

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

// Dashboard
app.get('/dashboard', ensureAuthenticated, (req, res) => {
  db.all('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 10', (err, logs) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error loading activity log');
    }
    
    db.get('SELECT * FROM settings WHERE id = 1', (err, settings) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error loading settings');
      }
      
      res.render('dashboard.ejs', { logs, settings });
    });
  });
});

// Configuration
app.get('/configuration', ensureAuthenticated, (req, res) => {
  db.get('SELECT * FROM settings WHERE id = 1', (err, settings) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error loading settings');
    }
    res.render('configuration.ejs', { settings });
  });
});

app.post('/configuration', ensureAuthenticated, (req, res) => {
  const {
    test_mode,
    test_email,
    imap_host,
    imap_port,
    imap_secure,
    imap_username,
    imap_password
  } = req.body;
  
  db.run(`UPDATE settings SET 
    test_mode = ?, 
    test_email = ?, 
    imap_host = ?, 
    imap_port = ?, 
    imap_secure = ?, 
    imap_username = ?, 
    imap_password = ?
    WHERE id = 1`,
    [test_mode, test_email, imap_host, imap_port, imap_secure, imap_username, imap_password],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error updating settings');
      }
      res.redirect('/configuration');
    });
});

// Mailboxes
app.get('/mailboxes', ensureAuthenticated, (req, res) => {
  db.all('SELECT * FROM mailboxes ORDER BY created_at DESC', (err, mailboxes) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error loading mailboxes');
    }
    res.render('mailboxes.ejs', { mailboxes });
  });
});

app.post('/mailboxes/add', ensureAuthenticated, (req, res) => {
  const { username, password } = req.body;
  
  // For simplicity, we're not hashing passwords in this demo
  db.run('INSERT INTO mailboxes (username, password) VALUES (?, ?)', 
    [username, password], 
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Error adding mailbox');
      }
      res.redirect('/mailboxes');
    });
});

app.post('/mailboxes/delete/:id', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM mailboxes WHERE id = ?', [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error deleting mailbox');
    }
    res.redirect('/mailboxes');
  });
});

// Activity log
app.get('/activity-log', ensureAuthenticated, (req, res) => {
  db.all('SELECT * FROM activity_log ORDER BY timestamp DESC', (err, logs) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error loading activity log');
    }
    res.render('activity-log.ejs', { logs });
  });
});

// Bounce messages
app.get('/bounce-messages', ensureAuthenticated, (req, res) => {
  db.all('SELECT * FROM bounce_messages ORDER BY created_at DESC', (err, messages) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error loading bounce messages');
    }
    res.render('bounce-messages.ejs', { messages });
  });
});

// SMTP Server
const smtpServerInstance = new smtpServer.SMTPServer({
  authOptional: true,
  onAuth(auth, session, callback) {
    // For simplicity, we're allowing all authentication attempts
    callback(null, { user: auth.username });
  },
  onData(stream, session, callback) {
    let emailData = '';
    
    stream.on('data', (chunk) => {
      emailData += chunk.toString();
    });
    
    stream.on('end', () => {
      // Process the email here
      processEmail(emailData, session)
        .then(() => {
          callback(null, 'Message accepted');
        })
        .catch((err) => {
          console.error('Error processing email:', err);
          callback(new Error('Failed to process email'));
        });
    });
  }
});

// Email processing function
async function processEmail(emailData, session) {
  // Log the activity
  const timestamp = new Date().toISOString();
  db.run('INSERT INTO activity_log (type, message, details) VALUES (?, ?, ?)', 
    ['email_received', 'Received new email', JSON.stringify({ from: session.user, timestamp })],
    (err) => {
      if (err) console.error('Error logging activity:', err);
    }
  );
  
  // Parse the email (simplified)
  const from = extractHeader(emailData, 'From');
  const to = extractHeader(emailData, 'To');
  const subject = extractHeader(emailData, 'Subject');
  const messageId = extractHeader(emailData, 'Message-ID');
  
  // Detect bounce type
  const bounceType = detectBounceType(emailData);
  
  // Save to database
  db.run('INSERT INTO bounce_messages (message_id, from_address, to_address, subject, bounce_type) VALUES (?, ?, ?, ?, ?)',
    [messageId, from, to, subject, bounceType],
    function(err) {
      if (err) {
        console.error('Error saving bounce message:', err);
      } else {
        // Log successful processing
        db.run('INSERT INTO activity_log (type, message, details) VALUES (?, ?, ?)', 
          ['bounce_processed', 'Processed bounce message', JSON.stringify({ messageId, from, to, bounceType })],
          (err) => {
            if (err) console.error('Error logging activity:', err);
          }
        );
      }
    }
  );
  
  // Get settings
  const settings = await new Promise((resolve) => {
    db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
      resolve(row || {});
    });
  });
  
  // Send notification if not in test mode or test email is set
  if (!settings.test_mode || settings.test_email) {
    const notificationEmail = settings.test_email || to;
    try {
      await sendNotification(notificationEmail, subject, bounceType);
      db.run('INSERT INTO activity_log (type, message, details) VALUES (?, ?, ?)', 
        ['notification_sent', 'Notification sent', JSON.stringify({ to: notificationEmail, subject })],
        (err) => {
          if (err) console.error('Error logging activity:', err);
        }
      );
    } catch (err) {
      console.error('Error sending notification:', err);
      db.run('INSERT INTO activity_log (type, message, details) VALUES (?, ?, ?)', 
        ['notification_error', 'Failed to send notification', JSON.stringify({ to: notificationEmail, subject, error: err.message })],
        (err) => {
          if (err) console.error('Error logging activity:', err);
        }
      );
    }
  }
}

// Helper function to extract headers
function extractHeader(emailData, headerName) {
  const regex = new RegExp(`${headerName}:\\s*(.+?)(?=\\r|\\n|$)`, 'i');
  const match = emailData.match(regex);
  return match ? match[1].trim()
