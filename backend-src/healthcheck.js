// healthcheck.js
// Node.js healthcheck for distroless container

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  timeout: 3000,
};

const maxAttempts = 5;
let attempt = 0;

function checkHealth() {
  attempt++;
  const req = http.get(options, (res) => {
    if (res.statusCode === 200) {
      process.exit(0);
    } else {
      if (attempt < maxAttempts) {
        setTimeout(checkHealth, 2000);
      } else {
        process.exit(1);
      }
    }
  });
  req.on('error', () => {
    if (attempt < maxAttempts) {
      setTimeout(checkHealth, 2000);
    } else {
      process.exit(1);
    }
  });
  req.on('timeout', () => {
    req.destroy();
    if (attempt < maxAttempts) {
      setTimeout(checkHealth, 2000);
    } else {
      process.exit(1);
    }
  });
}

checkHealth();
