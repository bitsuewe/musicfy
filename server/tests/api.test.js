import test from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';

test('API Health Check Endpoint', async () => {
  const res = await fetch('http://localhost:5000/health');
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'ok');
});

test('Authentication Input Validation (Weak Password)', async () => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'short', email: 'test@example.com', password: '123' })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'INVALID_PASSWORD');
});

test('Complete User Registration & Session Cookie Flow', async () => {
  const testUser = {
    username: `user_${Date.now()}`,
    email: `spicify_${Date.now()}@example.com`,
    password: 'SecurePassword2026!'
  };

  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });

  assert.strictEqual(regRes.status, 201);
  const regData = await regRes.json();
  assert.strictEqual(regData.success, true);
  assert.ok(regData.user.id);
  assert.strictEqual(regData.user.username, testUser.username);

  // Extract raw session cookie
  const cookieHeader = regRes.headers.get('set-cookie');
  assert.ok(cookieHeader);
  const rawCookie = cookieHeader.split(';')[0]; // spicify_session=...

  // Test GET /api/auth/me with session cookie
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Cookie: rawCookie }
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.success, true);
  assert.strictEqual(meData.user.username, testUser.username);

  // Test Logout Flow
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: rawCookie }
  });
  assert.strictEqual(logoutRes.status, 200);
  const logoutData = await logoutRes.json();
  assert.strictEqual(logoutData.success, true);
});

test('Duplicate Email Registration Prevention', async () => {
  const email = `dup_email_${Date.now()}@example.com`;
  
  // Register first user
  const res1 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `userA_${Date.now()}`, email, password: 'Password123!' })
  });
  assert.strictEqual(res1.status, 201);

  // Register second user with SAME email
  const res2 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `userB_${Date.now()}`, email, password: 'Password123!' })
  });
  assert.strictEqual(res2.status, 400);
  const data2 = await res2.json();
  assert.strictEqual(data2.success, false);
  assert.strictEqual(data2.error.code, 'EMAIL_ALREADY_EXISTS');
  assert.match(data2.error.message, /email address is already registered/i);
});

test('Duplicate Username Registration Prevention', async () => {
  const username = `unique_user_${Date.now()}`;

  // Register first user
  const res1 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email: `emailA_${Date.now()}@example.com`, password: 'Password123!' })
  });
  assert.strictEqual(res1.status, 201);

  // Register second user with SAME username
  const res2 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email: `emailB_${Date.now()}@example.com`, password: 'Password123!' })
  });
  assert.strictEqual(res2.status, 400);
  const data2 = await res2.json();
  assert.strictEqual(data2.success, false);
  assert.strictEqual(data2.error.code, 'USERNAME_ALREADY_EXISTS');
  assert.match(data2.error.message, /username is already taken/i);
});

test('Forgot Password Endpoint Response', async () => {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com' })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
});
