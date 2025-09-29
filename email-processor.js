const db = require('./database.js');

// Helper function to extract headers
function extractHeader(emailData, headerName) {
  const regex = new RegExp(`${headerName}:\\s*(.+?)(?=\\r|\\n|$)`, 'i');
  const match = emailData.match(regex);
  return match ? match[1].trim() : '';
}

// Bounce type detection
function detectBounceType(emailData) {
  const lowerEmail = emailData.toLowerCase();
  
  if (lowerEmail.includes('bounce') || lowerEmail.includes('undeliverable')) {
    return 'hard';
  } else if (lowerEmail.includes('delayed') || lowerEmail.includes('delivery delay')) {
    return 'soft';
  } else if (lowerEmail.includes('auto-submitted') || lowerEmail.includes('automatic reply')) {
    return 'auto_reply';
  } else if (lowerEmail.includes('smtp') && (lowerEmail.includes('550') || lowerEmail.includes('552') || lowerEmail.includes('553'))) {
    return 'hard';
  } else if (lowerEmail.includes('smtp') && (lowerEmail.includes('450') || lowerEmail.includes('451') || lowerEmail.includes('452'))) {
    return 'soft';
  }
  
  return 'unknown';
}

// Send notification function
async function sendNotification(to, subject, bounceType) {
  // This is a placeholder - in a real implementation, this would send actual emails
  console.log(`Sending notification to ${to} about ${bounceType} bounce: ${subject}`);
  // In production, you'd use nodemailer here:
  // const transporter = nodemailer.createTransporter({/* your config */});
  // await transporter.sendMail({...});
}

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

module.exports = {
  processEmail,
  extractHeader,
  detectBounceType
};