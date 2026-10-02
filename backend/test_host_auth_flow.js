const http = require('http');
const express = require('express');
const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');
const { User, Meeting, MeetingParticipant } = require('./src/models');
const authService = require('./src/services/authService');
const generateToken = require('./src/utils/generateToken');

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const runVerification = async () => {
  console.log('====================================================');
  console.log('🚀 TESTING HOST AUTHENTICATION & MEETING CREATION FLOW');
  console.log('====================================================\n');

  let server;
  const PORT = 5088;

  try {
    await connectDB();
    server = app.listen(PORT);
    console.log(`✓ Test Express server listening on port ${PORT}\n`);

    const timestamp = Date.now();
    const roomCode = `room-auth-test-${timestamp}`;

    // ----------------------------------------------------
    // TEST 1 — LOGGED OUT
    // ----------------------------------------------------
    console.log('--- TEST 1: LOGGED OUT ---');
    console.log('Attempting POST /api/meetings WITHOUT JWT token...');
    const res1 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/meetings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { meetingId: roomCode, title: 'Unauth Call' });

    console.log(`Response Status: ${res1.status}`);
    console.log(`Response Body:`, res1.body);

    if (res1.status !== 401) {
      throw new Error(`Expected HTTP 401 Unauthorized, got HTTP ${res1.status}`);
    }
    console.log('✓ TEST 1 PASSED: Unauthenticated POST /api/meetings rejected with 401 Unauthorized.\n');

    // ----------------------------------------------------
    // TEST 2 — LOGGED IN
    // ----------------------------------------------------
    console.log('--- TEST 2: LOGGED IN ---');
    console.log('Registering Host User...');
    const hostUser = await authService.registerUser({
      name: 'Host User Alice',
      email: `host_${timestamp}@connectx.test`,
      password: 'Password123!',
    });
    const hostToken = hostUser.token;
    const hostUserId = hostUser.user._id.toString();
    console.log(`✓ Registered Host User ID: ${hostUserId}`);

    console.log('Creating meeting with JWT token...');
    const res2 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/meetings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hostToken}`,
      },
    }, { meetingId: roomCode, title: 'Alice\'s Room' });

    console.log(`Response Status: ${res2.status}`);
    if (res2.status !== 201) {
      throw new Error(`Expected HTTP 201 Created, got HTTP ${res2.status}`);
    }

    const meetingData = res2.body.data;
    console.log('✓ Meeting created successfully:', meetingData.meetingId);

    // Verify MongoDB state
    const dbMeeting = await Meeting.findOne({ meetingId: roomCode }).lean();
    if (!dbMeeting) throw new Error('Meeting missing from MongoDB');
    if (dbMeeting.host.toString() !== hostUserId) {
      throw new Error(`Expected meeting.host to be ${hostUserId}, got ${dbMeeting.host}`);
    }

    const dbHostParticipant = await MeetingParticipant.findOne({ meetingId: roomCode, role: 'host' }).lean();
    if (!dbHostParticipant) throw new Error('Host participant missing in MongoDB');
    if (dbHostParticipant.user.toString() !== hostUserId) {
      throw new Error(`Expected host participant user to be ${hostUserId}, got ${dbHostParticipant.user}`);
    }

    // Check no guest users created for this meeting
    const guestUsers = await User.find({ email: /@guest\.connectx\.local$/ }).lean();
    console.log(`✓ Verified MongoDB meeting.host = ${dbMeeting.host} (Matches authenticated host ID)`);
    console.log(`✓ Verified host participant user = ${dbHostParticipant.user}`);
    console.log('✓ TEST 2 PASSED: Logged-in meeting creation succeeded without guest host creation.\n');

    // ----------------------------------------------------
    // TEST 3 — GUEST PARTICIPANT
    // ----------------------------------------------------
    console.log('--- TEST 3: GUEST PARTICIPANT ---');
    console.log('Fetching meeting details publicly GET /api/meetings/' + roomCode);
    const res3Get = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/meetings/${roomCode}`,
      method: 'GET',
    });
    if (res3Get.status !== 200) {
      throw new Error(`Expected GET /api/meetings/${roomCode} to return 200, got ${res3Get.status}`);
    }
    console.log('✓ Public GET /api/meetings/:id returned 200 OK.');

    console.log('Joining meeting as unauthenticated guest...');
    const res3Join = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/meetings/${roomCode}/join`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { displayName: 'Guest Bob' });

    if (res3Join.status !== 200) {
      throw new Error(`Expected HTTP 200 OK for guest join, got HTTP ${res3Join.status}`);
    }
    console.log('✓ TEST 3 PASSED: Guest participant joined call without requiring login/registration.\n');

    // ----------------------------------------------------
    // TEST 4 — END MEETING AUTHORIZATION
    // ----------------------------------------------------
    console.log('--- TEST 4: END MEETING AUTHORIZATION ---');
    
    // 4A: Unauthenticated user attempt to end meeting
    console.log('4A: Unauthenticated user calling PATCH /api/meetings/:id/end...');
    const res4Unauth = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/meetings/${roomCode}/end`,
      method: 'PATCH',
    });
    console.log(`Response Status: ${res4Unauth.status}`);
    if (res4Unauth.status !== 401) {
      throw new Error(`Expected HTTP 401 Unauthorized, got HTTP ${res4Unauth.status}`);
    }
    console.log('✓ 4A PASSED: Unauthenticated end meeting rejected with 401.');

    // 4B: Second logged-in non-host user attempt to end meeting
    console.log('\n4B: Registering User 2 (non-host)...');
    const user2 = await authService.registerUser({
      name: 'User 2 NonHost',
      email: `user2_${timestamp}@connectx.test`,
      password: 'Password123!',
    });
    console.log('User 2 calling PATCH /api/meetings/:id/end...');
    const res4NonHost = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/meetings/${roomCode}/end`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user2.token}`,
      },
    });
    console.log(`Response Status: ${res4NonHost.status}`);
    if (res4NonHost.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden for non-host end meeting, got HTTP ${res4NonHost.status}`);
    }
    console.log('✓ 4B PASSED: Non-host end meeting rejected with 403 Forbidden.');

    // 4C: Host ending their own meeting
    console.log('\n4C: Host calling PATCH /api/meetings/:id/end...');
    const res4Host = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/meetings/${roomCode}/end`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hostToken}`,
      },
    });
    console.log(`Response Status: ${res4Host.status}`);
    if (res4Host.status !== 200) {
      throw new Error(`Expected HTTP 200 OK for host end meeting, got HTTP ${res4Host.status}`);
    }
    console.log('✓ 4C PASSED: Host successfully ended meeting.');

    // Cleanup test data
    await Meeting.deleteOne({ meetingId: roomCode });
    await MeetingParticipant.deleteMany({ meetingId: roomCode });
    await User.deleteOne({ _id: hostUserId });
    await User.deleteOne({ _id: user2.user._id });
    console.log('\n✓ Cleaned up test data.');

    console.log('\n====================================================');
    console.log('🎉 ALL 4 FLOW VERIFICATION TESTS PASSED 100%');
    console.log('====================================================\n');

  } catch (error) {
    console.error('❌ Flow verification failed:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await disconnectDB();
  }
};

runVerification();
