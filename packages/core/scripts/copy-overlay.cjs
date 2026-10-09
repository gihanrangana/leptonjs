const { copyFileSync, mkdirSync } = require('node:fs');
const { dirname, join } = require('node:path');

const from = join(__dirname, '../src/ipc/dev-overlay.js');
const to = join(__dirname, '../dist/ipc/dev-overlay.js');

mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
