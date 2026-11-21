#!/usr/bin/env node
// Hermes cannot write bytecode into this machine's Windows temp folders, so keep compiler temp inside the project.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const tmp = path.join(root, '.tmp');
fs.mkdirSync(tmp, { recursive: true });

const result = spawnSync(
  process.execPath,
  [require.resolve('eas-cli/bin/run'), 'update', ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, TEMP: tmp, TMP: tmp },
  },
);

process.exit(result.status ?? 1);
