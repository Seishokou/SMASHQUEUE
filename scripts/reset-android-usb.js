const { execFileSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

const sdkRoot =
  process.env.ANDROID_SDK_ROOT ||
  process.env.ANDROID_HOME ||
  join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');

const adbPath = process.platform === 'win32'
  ? join(sdkRoot, 'platform-tools', 'adb.exe')
  : 'adb';

if (process.platform === 'win32' && !existsSync(adbPath)) {
  console.error(`Android platform-tools was not found at:\n${adbPath}`);
  process.exit(1);
}

function adb(args) {
  return execFileSync(adbPath, args, { encoding: 'utf8' });
}

try {
  console.log('Stopping ADB server...');
  adb(['kill-server']);

  console.log('Starting ADB server...');
  adb(['start-server']);

  console.log('Connected devices:');
  console.log(adb(['devices']));
  console.log('If your phone still says offline, unlock it and approve the USB debugging prompt.');
} catch (error) {
  console.error('Could not reset ADB.');
  console.error(error.message);
  process.exit(1);
}
