require('../shared/env').loadEnv();
const path = require('path');
const { spawn } = require('child_process');

const services = [
  { name: 'device-gateway', file: path.join(__dirname, '..', 'device-gateway', 'server.js') },
  { name: 'tracking-service', file: path.join(__dirname, '..', 'tracking-service', 'server.js') },
  { name: 'asset-service', file: path.join(__dirname, '..', 'asset-service', 'server.js') },
  { name: 'integration-service', file: path.join(__dirname, '..', 'integration-service', 'server.js') },
  { name: 'admin-api', file: path.join(__dirname, '..', 'admin-api', 'server.js') },
];

const children = [];

function prefixOutput(name, stream, colorCode) {
  stream.on('data', (chunk) => {
    const text = chunk.toString().trimEnd();
    if (!text) return;
    process.stdout.write(`\x1b[${colorCode}m[${name}]\x1b[0m ${text}\n`);
  });
}

for (const [index, service] of services.entries()) {
  const child = spawn(process.execPath, [service.file], {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  prefixOutput(service.name, child.stdout, 32 + (index % 6));
  prefixOutput(`${service.name}:err`, child.stderr, 31);

  child.on('exit', (code) => {
    process.stdout.write(`[${service.name}] exited with code ${code}\n`);
  });

  children.push(child);
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
