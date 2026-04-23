const fs = require('fs');
const path = require('path');

if (process.platform === 'win32') {
  console.log('[postinstall] Skipping node-pty chmod on Windows');
  process.exit(0);
}

const targets = [
  path.join(__dirname, '..', 'node_modules', 'node-pty', 'prebuilds', 'darwin-arm64', 'spawn-helper'),
  path.join(__dirname, '..', 'node_modules', 'node-pty', 'prebuilds', 'darwin-x64', 'spawn-helper'),
];

for (const target of targets) {
  try {
    if (fs.existsSync(target)) {
      fs.chmodSync(target, 0o755);
      console.log(`[postinstall] chmod +x ${target}`);
    }
  } catch (err) {
    console.warn(`[postinstall] Failed to chmod ${target}: ${err.message}`);
  }
}
