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