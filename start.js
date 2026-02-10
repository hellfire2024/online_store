// Minimal CommonJS wrapper for Hostinger Node.js
require('./dist/server.js');
    
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
