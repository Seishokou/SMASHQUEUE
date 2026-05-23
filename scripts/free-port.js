const { execFileSync, execSync } = require('node:child_process');

const port = process.argv[2] || '8081';

if (process.platform !== 'win32') {
  process.exit(0);
}

try {
  const output = execSync(`netstat -ano | findstr :${port}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  const pids = new Set();

  output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes('LISTENING'))
    .forEach((line) => {
      const parts = line.split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') pids.add(pid);
    });

  for (const pid of pids) {
    console.log(`Stopping process ${pid} using port ${port}...`);
    execFileSync('taskkill.exe', ['/PID', pid, '/F'], { stdio: 'ignore' });
  }
} catch {
  // Nothing is listening on this port.
}
