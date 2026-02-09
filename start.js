#!/usr/bin/env node
/**
 * Application Startup Wrapper with Enhanced Error Diagnostics
 * This is the main entry point. It logs all startup information to startup.log
 * so we can debug deployment issues without relying on visible console output.
 */

import { writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

const LOG_FILE = join(process.cwd(), 'startup.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  try {
    appendFileSync(LOG_FILE, line + '\n', { encoding: 'utf8' });
  } catch (e) {
    // Log to stderr if file write fails
  }
  process.stdout.write(line + '\n');
  process.stderr.write(line + '\n');
}

// Initialize log file
try {
  writeFileSync(LOG_FILE, `\n\n================================\nApp startup: ${new Date().toISOString()}\n================================\n`, { encoding: 'utf8' });
} catch (e) {
  // ignore
}

// Main startup function
async function startup() {
  log('🚀 APPLICATION STARTUP WRAPPER');
  log('📍 PID: ' + process.pid);
  log('🔢 Node: ' + process.version);
  log('📂 CWD: ' + process.cwd());
  log('');
  
  // Log environment
  log('🌍 Environment Variables:');
  log('  NODE_ENV=' + (process.env.NODE_ENV || 'not set'));
  log('  PORT=' + (process.env.PORT || 'not set'));
  log('  SKIP_DB_CHECK=' + (process.env.SKIP_DB_CHECK || 'not set'));
  log('  CORS_ORIGIN=' + (process.env.CORS_ORIGIN || 'not set'));
  log('');
  
  // Check if dist/server.js exists
  try {
    const fs = await import('fs/promises');
    const servePath = join(process.cwd(), 'dist', 'server.js');
    const exists = await fs.access(servePath).then(() => true).catch(() => false);
    if (!exists) {
      throw new Error(`dist/server.js does not exist at ${servePath}`);
    }
    log('✅ dist/server.js found');
  } catch (err) {
    log('❌ FILE CHECK FAILED: ' + err.message);
    throw err;
  }
  
  try {
    log('📦 Importing ./dist/server.js...');
    const startTime = Date.now();
    const serverModule = await import('./dist/server.js');
    const importTime = Date.now() - startTime;
    log('✅ Server module imported successfully (' + importTime + 'ms)');
    log('🎯 Application should now be listening');
    return true;
  } catch (err) {
    log('❌ IMPORT FAILED');
    log('Error Type: ' + (err?.name || 'Unknown'));
    log('Error Message: ' + (err?.message || String(err)));
    log('Error Code: ' + (err?.code || 'N/A'));
    if (err?.stack) {
      log('Stack Trace:');
      err.stack.split('\n').forEach((line, i) => {
        if (i < 15) log('  ' + line);
      });
    }
    throw err;
  }
}

// Signal handlers
process.on('SIGTERM', () => {
  log('📌 SIGTERM received - shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('📌 SIGINT received - shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log('❌ UNCAUGHT EXCEPTION: ' + (err?.message || String(err)));
  if (err?.stack) {
    err.stack.split('\n').forEach(line => log('  ' + line));
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('❌ UNHANDLED REJECTION');
  log('  Promise: ' + String(promise));
  log('  Reason: ' + String(reason));
  if (reason instanceof Error && reason.stack) {
    reason.stack.split('\n').forEach(line => log('  ' + line));
  }
  process.exit(1);
});

// Start the application and keep it alive
startup()
  .then(() => {
    log('✅ Startup completed successfully');
    log('Ready to accept requests');
    log('Keeping process alive with setInterval...');
    // Keep the process alive indefinitely
    setInterval(() => {
      // This keeps the event loop active
    }, 1000);
  })
  .catch(err => {
    log('❌ Startup error: ' + (err?.message || String(err)));
    if (err?.stack) {
      err.stack.split('\n').forEach(line => log('  ' + line));
    }
    process.exit(1);
  });
