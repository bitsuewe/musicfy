import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

console.log('[postinstall] Starting postinstall setup...');

// 1. Prisma Client Generation
try {
  console.log('[postinstall] Generating Prisma Client via direct Node CLI...');
  const prismaCli = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js');
  execSync(`node "${prismaCli}" generate`, {
    cwd: serverRoot,
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('[postinstall] Prisma Client generated successfully.');
} catch (err) {
  console.warn('[postinstall] Direct Node CLI failed, trying npx prisma generate...', err.message);
  try {
    execSync('npx prisma generate', {
      cwd: serverRoot,
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log('[postinstall] Prisma Client generated via npx.');
  } catch (npxErr) {
    console.warn('[postinstall] Warning: Prisma Client generation encountered an issue:', npxErr.message);
  }
}

// 2. yt-dlp binary check/download
try {
  console.log('[postinstall] Ensuring yt-dlp binary...');
  await import('./ensure-ytdlp.js');
} catch (ytdlpErr) {
  console.warn('[postinstall] yt-dlp setup note:', ytdlpErr.message);
}

console.log('[postinstall] Postinstall completed successfully.');
