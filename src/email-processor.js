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