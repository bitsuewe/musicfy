import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

// Check if yt-dlp or python module is already available
const checkAvailable = () => {
  const candidates = [
    'yt-dlp --version',
    'python3 -m yt_dlp --version',
    'python -m yt_dlp --version',
    'py -m yt_dlp --version'
  ];
  for (const cmd of candidates) {
    try {
      execSync(cmd, { stdio: 'ignore', timeout: 5000 });
      console.log(`[yt-dlp] Found existing engine via: ${cmd.split(' ')[0]}`);
      return true;
    } catch (e) {}
  }
  return false;
};

// Download standalone executable binary if missing
const downloadBinary = () => {
  const isWindows = process.platform === 'win32';
  const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
  const binaryPath = path.join(serverRoot, binaryName);

  if (fs.existsSync(binaryPath)) {
    console.log(`[yt-dlp] Standalone binary already exists at ${binaryPath}`);
    return;
  }

  const url = isWindows
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

  console.log(`[yt-dlp] Downloading official standalone binary from ${url}...`);

  const file = fs.createWriteStream(binaryPath);
  const getFollow = (downloadUrl) => {
    https.get(downloadUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return getFollow(res.headers.location);
      }
      if (res.statusCode !== 200) {
        console.warn(`[yt-dlp] Download failed with status ${res.statusCode}`);
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        if (!isWindows) {
          try {
            fs.chmodSync(binaryPath, 0o755);
          } catch (e) {}
        }
        console.log(`[yt-dlp] Standalone binary successfully installed at ${binaryPath}`);
      });
    }).on('error', (err) => {
      console.warn('[yt-dlp] Download error:', err.message);
    });
  };

  getFollow(url);
};

if (!checkAvailable()) {
  downloadBinary();
}
