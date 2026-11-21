#!/usr/bin/env node
// Some terminals inject an HTTP proxy that Expo's fetch cannot reach, which kills `expo start`; Metro does not need a proxy.
const { spawn } = require('node:child_process');

const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NODE_USE_ENV_PROXY'].includes(key.toUpperCase())) {
    delete env[key];
  }
}

const child = spawn(
  process.execPath,
  [require.resolve('expo/bin/cli'), 'start', ...process.argv.slice(2)],
  { stdio: 'inherit', env },
);

child.on('exit', (code) => process.exit(code ?? 1));
