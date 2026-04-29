 require('../shared/env').loadEnv();
const net = require('net');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { runSchema } = require('../database/schema');

const services = [
  { name: 'device-gateway', file: path.join(__dirname, '..', 'device-gateway', 'server.js') },
  { name: 'tracking-service', file: path.join(__dirname, '..', 'tracking-service', 'server.js') },
  { name: 'asset-service', file: path.join(__dirname, '..', 'asset-service', 'server.js') },
  { name: 'integration-service', file: path.join(__dirname, '..', 'integration-service', 'server.js') },
  { name: 'admin-api', file: path.join(__dirname, '..', 'admin-api', 'server.js') },
];

const children = [];
let shuttingDown = false;

const serviceBindings = [
  { name: 'device-gateway-tcp', host: process.env.DGW_HOST || '127.0.0.1', port: Number(process.env.DGW_PORT || 5000) },
  { name: 'device-gateway-http', host: process.env.DGW_API_HOST || '127.0.0.1', port: Number(process.env.DGW_API_PORT || 5001) },
  { name: 'tracking-service', host: process.env.TS_HOST || '127.0.0.1', port: Number(process.env.TS_PORT || 3001) },
  { name: 'asset-service', host: process.env.AS_HOST || '127.0.0.1', port: Number(process.env.AS_PORT || 3002) },
  { name: 'integration-service', host: process.env.IS_HOST || '127.0.0.1', port: Number(process.env.IS_PORT || 3003) },
  { name: 'admin-api', host: process.env.AA_HOST || '127.0.0.1', port: Number(process.env.AA_PORT || 4000) },
];

function prefixOutput(name, stream, colorCode) {
  stream.on('data', (chunk) => {
    const text = chunk.toString().trimEnd();
    if (!text) return;
    process.stdout.write(`\x1b[${colorCode}m[${name}]\x1b[0m ${text}\n`);
  });
}

function stopExistingRepoServices() {
  try {
    if (process.platform === 'win32') {
      const backendRoot = path.join(__dirname, '..');
      const command = [
        `$backendRoot = '${backendRoot}'`,
        `$currentPid = ${process.pid}`,
        "Get-CimInstance Win32_Process | Where-Object {",
        "  $_.Name -eq 'node.exe' -and",
        "  $_.ProcessId -ne $currentPid -and",
        "  $null -ne $_.CommandLine -and",
        "  $_.CommandLine -like ('*' + $backendRoot + '*') -and",
        "  ($_.CommandLine -like '*server.js*' -or $_.CommandLine -like '*start-all.js*')",
        "} | Select-Object -ExpandProperty ProcessId",
      ].join('\n');

      const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', command], {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      output
        .split(/\r?\n/)
        .map((line) => Number(line.trim()))
        .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid)
        .forEach((pid) => {
          try {
            process.kill(pid);
          } catch (_error) {
            // Ignore races where the process exits between discovery and termination.
          }
        });
      return;
    }

    const output = execFileSync('ps', ['-axo', 'pid=,command='], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const normalizedFiles = services.map((service) => service.file);

    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const firstSpace = line.indexOf(' ');
        if (firstSpace === -1) return;

        const pid = Number(line.slice(0, firstSpace).trim());
        const commandLine = line.slice(firstSpace + 1);
        if (!Number.isInteger(pid) || pid === process.pid) return;

        if (normalizedFiles.some((file) => commandLine.includes(file))) {
          process.kill(pid, 'SIGTERM');
        }
      });
  } catch (error) {
    process.stderr.write(`Warning: failed to clean up previous backend processes: ${error.message}\n`);
  }
}

function isPortInUse(host, port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(true);
        return;
      }

      reject(error);
    });

    server.once('listening', () => {
      server.close(() => resolve(false));
    });

    server.listen(port, host);
  });
}

async function getOccupiedBindings() {
  const results = [];

  for (const binding of serviceBindings) {
    if (await isPortInUse(binding.host, binding.port)) {
      results.push(binding);
    }
  }

  return results;
}

function spawnServices() {
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
}

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function main() {
  try {
    stopExistingRepoServices();
    const occupiedBindings = await getOccupiedBindings();
    if (occupiedBindings.length === serviceBindings.length) {
      process.stdout.write('CH RTV backend is already running on the configured ports. Reusing existing services.\n');
      return;
    }

    if (occupiedBindings.length > 0) {
      const bindingsText = occupiedBindings
        .map((binding) => `${binding.name} ${binding.host}:${binding.port}`)
        .join(', ');
      process.stderr.write(`Backend startup aborted because these ports are already in use: ${bindingsText}\n`);
      process.stderr.write('Stop the existing backend instance first, then run npm start again.\n');
      process.exit(1);
    }

    await runSchema();
    spawnServices();
  } catch (error) {
    process.stderr.write(`Backend startup failed during schema initialization: ${error.message}\n`);
    process.exit(1);
  }
}

main();
