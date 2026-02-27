// healthcheck.js
// Node.js healthcheck for Docker container

const http = require('http');
const fs = require('fs');
const path = require('path');

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[healthcheck] [${ts}] ${msg}`);
}

// Check if startup log exists and show recent logs
try {
  const logPath = path.join('/app', 'startup.log');
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n').slice(-10); // Last 10 lines
    log('Recent startup logs:');
    lines.forEach(line => {
      if (line.trim()) log('  ' + line);
    });
  }
} catch (e) {
  log(`Could not read startup logs: ${e.message}`);
}

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  timeout: 3000,
  method: 'GET',
};

const maxAttempts = 5;
let attempt = 0;

function checkHealth() {
  attempt++;
  log(`Health check attempt ${attempt}/${maxAttempts}`);
  
  const req = http.get(options, (res) => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
      log(`Server responded with status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        log('✓ Health check PASSED - server is ready');
        process.exit(0);
      } else {
        log(`✗ Health check failed - unexpected status ${res.statusCode}`);
        if (attempt < maxAttempts) {
          const delay = 1000 + (attempt * 500); // Increasing delays
          log(`Retrying in ${delay}ms...`);
          setTimeout(checkHealth, delay);
        } else {
          log('✗ Max attempts reached. Server is unhealthy.');
          process.exit(1);
        }
      }
    });
  });
  
  req.on('error', (err) => {
    log(`Connection error: ${err.code || err.message}`);
    if (attempt < maxAttempts) {
      const delay = 1000 + (attempt * 500);
      log(`Retrying in ${delay}ms...`);
      setTimeout(checkHealth, delay);
    } else {
      log('✗ Failed to connect after max attempts');
      process.exit(1);
    }
  });
  
  req.on('timeout', () => {
    log('Connection timeout');
    req.destroy();
    if (attempt < maxAttempts) {
      const delay = 1000 + (attempt * 500);
      log(`Retrying in ${delay}ms...`);
      setTimeout(checkHealth, delay);
    } else {
      log('✗ Connection timeout after max attempts');
      process.exit(1);
    }
  });
  
  req.setTimeout(4000); // Give request 4 seconds before timeout
}

log('Starting health check...');
checkHealth();
