const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'src-tauri', 'icons');
fs.mkdirSync(dir, { recursive: true });

// Minimal valid 1x1 PNG
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const pngBuf = Buffer.from(pngBase64, 'base64');

// Minimal ICO wrapping the PNG
const pngSize = pngBuf.length;
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(32, 0);
icoEntry.writeUInt8(32, 1);
icoEntry.writeUInt8(0, 2);
icoEntry.writeUInt8(0, 3);
icoEntry.writeUInt16LE(0, 4);
icoEntry.writeUInt16LE(32, 6);
icoEntry.writeUInt32LE(pngSize, 8);
icoEntry.writeUInt32LE(22, 12);
const icoBuf = Buffer.concat([icoHeader, icoEntry, pngBuf]);

fs.writeFileSync(path.join(dir, '32x32.png'), pngBuf);
fs.writeFileSync(path.join(dir, '128x128.png'), pngBuf);
fs.writeFileSync(path.join(dir, '128x128@2x.png'), pngBuf);
fs.writeFileSync(path.join(dir, 'icon.ico'), icoBuf);
fs.writeFileSync(path.join(dir, 'icon.icns'), pngBuf);

console.log('Icons created successfully');
