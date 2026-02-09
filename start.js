#!/usr/bin/env node

// CommonJS wrapper that imports ES module
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(process.cwd(), 'startup.log');

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (e) {}
  process.stdout.write(line);
  process.stderr.write(line);
}

// Initialize log
try {
  fs.writeFileSync(LOG_FILE, `\n=== STARTUP ${new Date().toISOString()} ===\n`, 'utf8');
} catch (e) {}

log('🚀 START.JS STARTING');
log('PID: ' + process.pid);
log('Node: ' + process.version);
log('CWD: ' + process.cwd());
log('PORT: ' + (process.env.PORT || '3001'));
log('NODE_ENV: ' + (process.env.NODE_ENV || 'development'));

const serverPath = './dist/server.js';
log('Loading: ' + serverPath);

// Use dynamic import to load ES module
(async () => {
  try {
    log('Importing server...');
    const server = await import(serverPath);
    log('✅ Server imported successfully');
    log('App is running!');
    
    // Keep alive
    setInterval(() => {}, 30000);
  } catch (err) {
    log('❌ ERROR loading server');
    log('Message: ' + (err.message || String(err)));
    if (err.stack) {
      const lines = err.stack.split('\n');
      lines.slice(0, 10).forEach(line => log('  ' + line));
    }
    process.exit(1);
  }
})();

// Cleanup
process.on('SIGTERM', () => {
  log('SIGTERM received');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  log('❌ Unhandled rejection: ' + String(reason));
  process.exit(1);
});
