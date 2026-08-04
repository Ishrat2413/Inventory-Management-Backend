import fs from 'fs';
import os from 'os';
import path from 'path';

// Define the path to the log directory
const logDir = path.join(__dirname, '..', '..', '..', 'logs');

// Ensure the logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Function to log messages and ensure log directories are properly created
export const logMessage = (message: string) => {
  const now = new Date();
  const dateAndTime = now.toDateString() + ' | ' + now.toTimeString();
  const dateString = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const logDirForToday = path.join(logDir, dateString);
  const logFileForToday = path.join(logDirForToday, 'access.log');

  // Ensure the directory for today's logs exists
  if (!fs.existsSync(logDirForToday)) {
    fs.mkdirSync(logDirForToday, { recursive: true });
  }

  // Log message format
  const logMessage = `Host Name: ${os.hostname()} | ${dateAndTime} | [INFO]: ${message}\n`;

  // Write to log file
  fs.appendFile(logFileForToday, logMessage, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err.message);
    }
  });
};

// Function to return a writable stream for Morgan
export const loggerStream = {
  write: (message: string) => logMessage(message.trim()),
};
