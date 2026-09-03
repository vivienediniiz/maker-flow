#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '../public/_headers');
const dest = path.join(__dirname, '../.next/_headers');

try {
  const content = fs.readFileSync(source, 'utf8');
  fs.writeFileSync(dest, content, 'utf8');
  console.log(`✅ Copied _headers: ${source} → ${dest}`);
} catch (err) {
  console.error(`❌ Error copying _headers:`, err.message);
  process.exit(1);
}
