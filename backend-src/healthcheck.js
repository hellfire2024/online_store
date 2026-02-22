// healthcheck.js
// Node.js healthcheck for distroless container


const http = require('http');
function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[healthcheck] [${ts}] ${msg}`);
}


const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/health',
  timeout: 3000,
};


const maxAttempts = 5;
let attempt = 0;


function checkHealth() {
  attempt++;
  log(`Attempt ${attempt} of ${maxAttempts}`);
  const req = http.get(options, (res) => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
      log(`Received status code: ${res.statusCode}`);
      log(`Response body: ${body}`);
      if (res.statusCode === 200) {
        log('Healthcheck passed.');
        process.exit(0);
      } else {
        log(`Healthcheck failed with status ${res.statusCode}`);
        if (attempt < maxAttempts) {
          setTimeout(checkHealth, 2000);
        } else {
          log('Max attempts reached. Exiting with failure.');
          process.exit(1);
        }
      }
    });
  });
  req.on('error', (err) => {
    log(`Request error: ${err && err.message ? err.message : err}`);
    log(`Request options: ${JSON.stringify(options)}`);
    if (attempt < maxAttempts) {
      setTimeout(checkHealth, 2000);
    } else {
      log('Max attempts reached after error. Exiting with failure.');
      process.exit(1);
    }
  });
  req.on('timeout', () => {
    log('Request timed out.');
    log(`Request options: ${JSON.stringify(options)}`);
    req.destroy();
    if (attempt < maxAttempts) {
      setTimeout(checkHealth, 2000);
    } else {
      log('Max attempts reached after timeout. Exiting with failure.');
      process.exit(1);
    }
  });
}

checkHealth();
