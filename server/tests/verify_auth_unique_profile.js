import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== Starting Auth, Uniqueness & Profile Verification ===\n');

  const ts = Date.now();
  const testEmail = `user_${ts}@musicfy.test`;
  const testUsername = `user_${ts}`;
  const testPassword = 'Password123!';

  // Test 1: Successful Registration
  console.log('1. Registering initial user...');
  const regRes = await axios.post(`${BASE_URL}/auth/register`, {
    username: testUsername,
    email: testEmail,
    password: testPassword
  });
  console.log('   Registration Status:', regRes.status, 'Success:', regRes.data.success);
  if (!regRes.data.success || !regRes.data.token) {
    throw new Error('Registration failed to return token');
  }
  const userToken = regRes.data.token;
  const userId = regRes.data.user.id;
  console.log('   User registered with ID:', userId);

  // Test 2: Duplicate Email Rejection (Case-Insensitive)
  console.log('\n2. Testing duplicate email rejection (different case)...');
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      username: `different_${ts}`,
      email: testEmail.toUpperCase(),
      password: 'AnotherPassword123!'
    });
    throw new Error('FAILED: Duplicate email was incorrectly allowed!');
  } catch (err) {
    if (err.response && err.response.status === 400 && err.response.data?.error?.code === 'EMAIL_ALREADY_EXISTS') {
      console.log('   PASSED: Duplicate email correctly rejected with 400 EMAIL_ALREADY_EXISTS:', err.response.data.error.message);
    } else {
      throw new Error(`Unexpected error on duplicate email: ${err.message}`);
    }
  }

  // Test 3: Duplicate Username Rejection (Case-Insensitive)
  console.log('\n3. Testing duplicate username rejection (different case)...');
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      username: testUsername.toUpperCase(),
      email: `another_${ts}@musicfy.test`,
      password: 'AnotherPassword123!'
    });
    throw new Error('FAILED: Duplicate username was incorrectly allowed!');
  } catch (err) {
    if (err.response && err.response.status === 400 && err.response.data?.error?.code === 'USERNAME_ALREADY_EXISTS') {
      console.log('   PASSED: Duplicate username correctly rejected with 400 USERNAME_ALREADY_EXISTS:', err.response.data.error.message);
    } else {
      throw new Error(`Unexpected error on duplicate username: ${err.message}`);
    }
  }

  // Test 4: Login with Email
  console.log('\n4. Testing login using EMAIL...');
  const loginEmailRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: testEmail,
    password: testPassword
  });
  console.log('   PASSED: Login with email successful. Status:', loginEmailRes.status, 'User:', loginEmailRes.data.user.username);

  // Test 5: Login with Username
  console.log('\n5. Testing login using USERNAME...');
  const loginUsernameRes = await axios.post(`${BASE_URL}/auth/login`, {
    emailOrUsername: testUsername,
    password: testPassword
  });
  console.log('   PASSED: Login with username successful. Status:', loginUsernameRes.status, 'User:', loginUsernameRes.data.user.username);

  // Test 6: Liking a song for User
  console.log('\n6. Testing liking a track for the user...');
  const authHeaders = { headers: { Authorization: `Bearer ${userToken}` } };
  const sampleTrack = {
    id: 'test_song_01',
    title: 'Test Song 1',
    artistName: 'Test Artist',
    thumbnail: 'https://example.com/thumb.jpg',
    durationSec: 210
  };

  const likeRes = await axios.post(`${BASE_URL}/tracks/${sampleTrack.id}/like`, { track: sampleTrack }, authHeaders);
  console.log('   Like response:', likeRes.data);

  // Test 7: Fetching User Likes
  console.log('\n7. Fetching likes for this user...');
  const userLikesRes = await axios.get(`${BASE_URL}/likes`, authHeaders);
  console.log('   User likes count:', userLikesRes.data.likes?.length);
  if (!userLikesRes.data.likes || userLikesRes.data.likes.length === 0) {
    throw new Error('Expected at least 1 liked song!');
  }

  // Test 8: Logging Playback History
  console.log('\n8. Logging history for this user...');
  await axios.post(`${BASE_URL}/history`, {
    trackId: sampleTrack.id,
    track: sampleTrack,
    durationSec: 210,
    completed: true
  }, authHeaders);

  const historyRes = await axios.get(`${BASE_URL}/history`, authHeaders);
  console.log('   User history count:', historyRes.data.history?.length);

  // Test 9: Creating a Playlist
  console.log('\n9. Creating a playlist for this user...');
  const plRes = await axios.post(`${BASE_URL}/playlists`, {
    title: 'My First Test Playlist',
    description: 'Testing user playlist count'
  }, authHeaders);
  console.log('   Playlist created:', plRes.data.playlist?.title);

  // Test 10: Fetching Profile - Must NOT be 0!
  console.log('\n10. Fetching user profile via /users/:id ...');
  const profRes = await axios.get(`${BASE_URL}/users/${userId}`);
  console.log('   Profile stats:');
  console.log('   - Liked songs count:', profRes.data.user?._count?.likes, '(expected >= 1)');
  console.log('   - Recent plays count:', profRes.data.user?._count?.history, '(expected >= 1)');
  console.log('   - Playlists count:', profRes.data.user?._count?.playlists, '(expected >= 1)');

  if (profRes.data.user?._count?.likes === 0) {
    throw new Error('Profile liked songs is stuck at 0!');
  }
  if (profRes.data.user?._count?.playlists === 0) {
    throw new Error('Profile playlists is stuck at 0!');
  }
  console.log('   PASSED: Profile stats accurately reflect real user data and are NOT zero!');

  // Test 11: Guest Download Rejection (Must require authentication)
  console.log('\n11. Testing guest download restriction...');
  try {
    await axios.get(`${BASE_URL}/music/download/${sampleTrack.id}`);
    throw new Error('FAILED: Guest was able to download without authentication!');
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log('   PASSED: Guest download correctly blocked with 401 Unauthorized.');
    } else {
      throw new Error(`Unexpected response on guest download: ${err.message}`);
    }
  }

  console.log('\n=== ALL 11 VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch((err) => {
  console.error('\nFAILED TEST:', err.message);
  process.exit(1);
});
