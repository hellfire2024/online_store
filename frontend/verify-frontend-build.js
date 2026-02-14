// This script lists all files in the frontend build output directory (dist)
// and attempts to extract available HTML files (entry points) as a basic check.
// You can expand this to parse routes from your React app if needed.

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');

console.log('==============================');
console.log('Frontend Build Verification');
console.log('Listing files in dist directory:');

if (fs.existsSync(distDir)) {
  const files = fs.readdirSync(distDir);
  files.forEach(file => {
    console.log(' -', file);
  });
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  if (htmlFiles.length > 0) {
    console.log('\nAvailable HTML entry points:');
    htmlFiles.forEach(f => console.log(' -', f));
  } else {
    console.log('No HTML entry points found in dist.');
  }
} else {
  console.log('dist directory does not exist. Build may have failed.');
}
console.log('==============================');
