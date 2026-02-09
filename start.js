#!/usr/bin/env node
/**
 * Application Startup Wrapper with File Logging
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
}

// Initialize log file
try {
  writeFileSync(LOG_FILE, `================================\nApp started: ${new Date().toISOString()}\n================================\n`, { encoding: 'utf8' });
} catch (e) {
  // ignore
}

// Main startup function
async function startup() {
  log('🚀 APPLICATION STARTUP WRAPPER');
  log('📍 PID: ' + process.pid);
  log('🔢 Node: ' + process.version);
  log('📂 CWD: ' + process.cwd());
  log('🌍 NODE_ENV: ' + (process.env.NODE_ENV || 'not set'));
  log('');
  
  try {
    log('📦 Importing ./dist/server.js');
    const serverModule = await import('./dist/server.js');
    log('✅ Server module imported successfully');
    log('🎯 Application is online and listening');
    return true;
  } catch (err) {
    log('❌ IMPORT FAILED');
    log('Error: ' + (err?.message || String(err)));
    log('Code: ' + (err?.code || 'N/A'));
    log('Type: ' + (err?.name || 'Unknown'));
    if (err?.stack) {
      log('Stack:');
      err.stack.split('\n').slice(0, 10).forEach((line, i) => {
        log('  ' + line);
      });
    }
    log('');
    process.exit(1);
  }
}

// Signal handlers
process.on('SIGTERM', () => {
  log('📌 SIGTERM received');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('📌 SIGINT received');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log('❌ UNCAUGHT EXCEPTION: ' + err.message);
  if (err.stack) {
    err.stack.split('\n').forEach(line => log('  ' + line));
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log('❌ UNHANDLED REJECTION: ' + String(reason));
  process.exit(1);
});

// Start the application
startup().catch(err => {
  log('❌ Startup error: ' + err.message);
  process.exit(1);
});
