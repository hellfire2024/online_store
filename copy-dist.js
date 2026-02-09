const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

const srcDir = path.join(__dirname, 'server', 'dist');
const destDir = path.join(__dirname, 'public_html');

if (fs.existsSync(srcDir)) {
  copyDir(srcDir, destDir);
  console.log('Copied server/dist to public_html');
} else {
  console.error('Source directory server/dist does not exist');
  process.exit(1);
}
