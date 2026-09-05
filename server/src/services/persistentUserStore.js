import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const memoryUsers = new Map();
export const memorySessions = new Map();

// Helper to load users from disk into memory
export const loadUsersFromDisk = () => {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((u) => {
          if (u && u.email) {
            memoryUsers.set(u.email.trim().toLowerCase(), u);
          }
        });
      }
    }
  } catch (e) {
    console.warn('Could not read users.json:', e.message);
  }
};

// Helper to load sessions from disk into memory
export const loadSessionsFromDisk = () => {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((s) => {
          if (s && s.tokenHash) {
            memorySessions.set(s.tokenHash, s);
          }
        });
      }
    }
  } catch (e) {
    console.warn('Could not read sessions.json:', e.message);
  }
};

// Initial hydration on startup
loadUsersFromDisk();
loadSessionsFromDisk();

const persistUsers = () => {
  try {
    const list = Array.from(memoryUsers.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write users.json:', e);
  }
};

const persistSessions = () => {
  try {
    const list = Array.from(memorySessions.values());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write sessions.json:', e);
  }
};

export const savePersistentUser = (user) => {
  if (!user || !user.email) return;
  const key = user.email.trim().toLowerCase();
  memoryUsers.set(key, user);
  persistUsers();
};

export const findPersistentUser = (identifier) => {
  if (!identifier) return null;
  const lower = String(identifier).trim().toLowerCase();

  // 1. Check in-memory map
  if (memoryUsers.has(lower)) {
    return memoryUsers.get(lower);
  }
  for (const u of memoryUsers.values()) {
    if (
      u.email?.trim().toLowerCase() === lower ||
      u.username?.trim().toLowerCase() === lower ||
      u.id === identifier
    ) {
      return u;
    }
  }

  // 2. Re-read disk in case written by parallel process or recent restart
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const u of list) {
          if (
            u &&
            (u.email?.trim().toLowerCase() === lower ||
              u.username?.trim().toLowerCase() === lower ||
              u.id === identifier)
          ) {
            memoryUsers.set(u.email.trim().toLowerCase(), u);
            return u;
          }
        }
      }
    }
  } catch (e) {}

  return null;
};

export const findPersistentUserById = (userId) => {
  if (!userId) return null;
  for (const u of memoryUsers.values()) {
    if (u.id === userId) return u;
  }
  return findPersistentUser(userId);
};

export const savePersistentSession = (tokenHash, data) => {
  memorySessions.set(tokenHash, data);
  persistSessions();
};

export const findPersistentSession = (tokenHash) => {
  if (!tokenHash) return null;
  let session = memorySessions.get(tokenHash);
  if (!session) {
    loadSessionsFromDisk();
    session = memorySessions.get(tokenHash);
  }
  if (!session) return null;
  if (new Date() > new Date(session.expiresAt)) {
    deletePersistentSession(tokenHash);
    return null;
  }
  return session;
};

export const deletePersistentSession = (tokenHash) => {
  memorySessions.delete(tokenHash);
  persistSessions();
};

export const deleteAllPersistentUserSessions = (userId) => {
  let changed = false;
  for (const [k, v] of memorySessions.entries()) {
    if (v.userId === userId) {
      memorySessions.delete(k);
      changed = true;
    }
  }
  if (changed) persistSessions();
};
