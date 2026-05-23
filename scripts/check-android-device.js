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
  console.error('Install Android Studio or Android SDK Platform-Tools, then try again.');
  process.exit(1);
}

function adb(args) {
  return execFileSync(adbPath, args, { encoding: 'utf8' });
}

try {
  adb(['start-server']);
  const output = adb(['devices']).trim();
  const devices = output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, state] = line.split(/\s+/);
      return { id, state };
    });

  if (!devices.length) {
    console.error('No Android device or emulator was detected by ADB.');
    console.error('Connect your phone, enable Developer options > USB debugging, then run npm run android again.');
    process.exit(1);
  }

  const onlineDevice = devices.find((device) => device.state === 'device');
  if (onlineDevice) {
    console.log(`Android device ready: ${onlineDevice.id}`);
    process.exit(0);
  }

  const offlineDevice = devices.find((device) => device.state === 'offline');
  if (offlineDevice) {
    console.error(`Android device ${offlineDevice.id} is offline.`);
    console.error('Fix on your phone: unplug USB, revoke USB debugging authorizations, reconnect USB, unlock phone, then tap "Allow USB debugging".');
    console.error('You can also run npm run start:lan and scan the QR code in Expo Go without using USB.');
    process.exit(1);
  }

  console.error(`ADB found a device, but it is not ready:\n${output}`);
  process.exit(1);
} catch (error) {
  console.error('Could not run ADB.');
  console.error(error.message);
  process.exit(1);
}
