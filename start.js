#!/usr/bin/env node
/**
 * Startup wrapper - ensures immediate execution logging
 * This file is the actual entry point for the Node.js application
 */

// Immediate startup signal - synchronous write to ensure it appears
process.stdout.write('\n');
process.stdout.write('╔════════════════════════════════════════════════════════╗\n');
process.stdout.write('║         🚀 NODE.JS APPLICATION STARTING                ║\n');
process.stdout.write('╚════════════════════════════════════════════════════════╝\n');
process.stdout.write('⏱️  Timestamp: ' + new Date().toISOString() + '\n');
process.stdout.write('📍 Process ID: ' + process.pid + '\n');
process.stdout.write('🔢 Node Version: ' + process.version + '\n');
process.stdout.write('📂 Working Directory: ' + process.cwd() + '\n');
process.stdout.write('📄 Entry File: ' + __filename + '\n');
process.stdout.write('\n');

// Now import and run the server
process.stdout.write('📦 Importing compiled server...\n');

try {
  // Import the compiled server - this will execute all top-level code
  // including middleware setup and the startServer() call
  import('./dist/server.js')
    .then((module) => {
      process.stdout.write('✅ Server module imported successfully\n');
      process.stdout.write('🎯 Application is running\n');
    })
    .catch((err) => {
      process.stderr.write('❌ FATAL: Failed to import server module\n');
      process.stderr.write('   Error: ' + err.message + '\n');
      process.stderr.write('   Stack: ' + err.stack + '\n');
      process.exit(1);
    });
} catch (err) {
  process.stderr.write('❌ FATAL: Synchronous error during server import\n');
  process.stderr.write('   Error: ' + err.message + '\n');
  process.stderr.write('   Stack: ' + err.stack + '\n');
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  process.stdout.write('\n📌 SIGTERM received - shutting down\n');
  process.exit(0);
});

process.on('SIGINT', () => {
  process.stdout.write('\n📌 SIGINT received - shutting down\n');
  process.exit(0);
});

// Log unhandled errors
process.on('uncaughtException', (err) => {
  process.stderr.write('\n❌ UNCAUGHT EXCEPTION:\n');
  process.stderr.write('   ' + err.message + '\n');
  process.stderr.write('   ' + err.stack + '\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  process.stderr.write('\n❌ UNHANDLED REJECTION:\n');
  process.stderr.write('   Promise: ' + String(promise) + '\n');
  process.stderr.write('   Reason: ' + String(reason) + '\n');
  process.exit(1);
});
