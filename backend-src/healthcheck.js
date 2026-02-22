// healthcheck.js
// Node.js healthcheck for distroless container
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  timeout: 3000,
};

const req = http.get(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => process.exit(1));
req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});
