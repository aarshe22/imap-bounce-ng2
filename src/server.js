```javascript src/server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');

// Initialize database
const db = require('./database.js');

// Import components
const initializeRoutes = require('./routes.js');
const initializeAuth = require('./auth.js');
const initializeSMTP = require('./smtp-handler.js');

// Create directories if they don't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
  secret: 'bounce_handler_secret_key',
  resave: false,
  saveUninitialized: false
}));

// Flash messages middleware
app.use(flash());

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Initialize authentication
initializeAuth(passport);

// Initialize routes
initializeRoutes(app, passport);

// Initialize SMTP server
initializeSMTP();

// Start the main application
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
```

```javascript src/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

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

module.exports = db;
```

```javascript src/auth.js
const LocalStrategy = require('passport-local').Strategy;
const db = require('./database.js');

function initialize(passport) {
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
}

module.exports = initialize;
```

```javascript src/routes.js
const db = require('./database.js');

function initializeRoutes(app, passport) {
  // Middleware for authentication
  const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error', 'Please log in to access this page');
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
    failureRedirect: '/login',
    failureFlash: true
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
        req.flash('success', 'Settings updated successfully');
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
        req.flash('success', 'Mailbox added successfully');
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
      req.flash('success', 'Mailbox deleted successfully');
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
}

module.exports = initializeRoutes;
```

```javascript src/smtp-handler.js
const smtpServer = require('smtp-server');
const db = require('./database.js');
const emailProcessor = require('./email-processor.js');

function initializeSMTP() {
  const server = new smtpServer.SMTPServer({
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
        emailProcessor.processEmail(emailData, session)
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

  // Start SMTP server on port 25
  server.listen(25, () => {
    console.log('SMTP server listening on port 25');
  });

  return server;
}

module.exports = initializeSMTP;

