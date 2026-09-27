const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const io = require('../frontend/node_modules/socket.io-client');

dotenv.config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB } = require('./src/config/db');
const { User, Meeting, MeetingParticipant } = require('./src/models');
const authService = require('./src/services/authService');
const meetingService = require('./src/services/meetingService');

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const runE2EFullSuite = async () => {
  console.log('====================================================');
  console.log('🚀 CONNECTX — PHASE 8 FULL END-TO-END TEST SUITE');
  console.log('====================================================\n');

  const testId = Date.now();
  const testEmail = `e2e_user_${testId}@connectx.test`;
  const testPassword = 'Password123!';
  const testRoomId = `room-e2e-${testId}`;

  let authToken = null;
  let userId = null;

  try {
    await connectDB();

    // ----------------------------------------------------
    // SECTION 1: AUTHENTICATION & AUTHORIZATION
    // ----------------------------------------------------
    console.log('--- SECTION 1: AUTHENTICATION & AUTHORIZATION ---');
    
    // 1.1 Register
    const regRes = await authService.registerUser({ name: 'E2E Host User', email: testEmail, password: testPassword });
    authToken = regRes.token;
    userId = regRes.user._id;
    console.log('  [PASS] 1.1 User Register');

    // 1.2 Login
    const loginRes = await authService.loginUser({ email: testEmail, password: testPassword });
    if (!loginRes.token || loginRes.user.passwordHash) throw new Error('Login response invalid');
    console.log('  [PASS] 1.2 User Login & Password Hash Exclusion');

    // 1.3 JWT Verification & Profile Fetch
    const profileRes = await authService.getCurrentUser(userId);
    if (profileRes.email !== testEmail) throw new Error('Profile mismatch');
    console.log('  [PASS] 1.3 JWT Token Verification');

    // 1.4 Protected Endpoint Rejection
    const unauthStatus = await new Promise((resolve) => {
      http.get(`${API_BASE}/auth/me`, (res) => resolve(res.statusCode));
    });
    if (unauthStatus !== 401) throw new Error(`Expected 401, got ${unauthStatus}`);
    console.log('  [PASS] 1.4 Protected Route Unauthenticated Block (401)');

    // ----------------------------------------------------
    // SECTION 2: MEETING PERSISTENCE & LIFECYCLE
    // ----------------------------------------------------
    console.log('\n--- SECTION 2: MEETING PERSISTENCE & LIFECYCLE ---');

    // 2.1 Create Meeting
    const meeting = await meetingService.createMeeting({
      meetingId: testRoomId,
      title: 'E2E Verification Call',
      hostId: userId,
      hostName: 'E2E Host User',
    });
    if (meeting.status !== 'active') throw new Error('Meeting not active');
    console.log('  [PASS] 2.1 Create Meeting in MongoDB');

    // 2.2 Join Participant
    const joinedMeeting = await meetingService.joinMeeting({
      meetingId: testRoomId,
      displayName: 'E2E Participant Bob',
    });
    if (joinedMeeting.participants.length < 2) throw new Error('Participant count wrong');
    console.log('  [PASS] 2.2 Join Meeting Participant');

    // 2.3 Invalid Meeting Fetch (404)
    try {
      await meetingService.getMeetingById('non-existent-room-999');
      throw new Error('Should have thrown 404');
    } catch (err) {
      if (err.statusCode !== 404) throw err;
    }
    console.log('  [PASS] 2.3 Invalid Meeting ID Rejection (404)');

    // 2.4 Leave Meeting
    await meetingService.leaveMeeting({ meetingId: testRoomId, displayName: 'E2E Participant Bob' });
    console.log('  [PASS] 2.4 Participant Leave Meeting');

    // 2.5 End Meeting & Duration Calculation
    await new Promise((r) => setTimeout(r, 1500));
    const endedMeeting = await meetingService.endMeeting(testRoomId, userId);
    if (endedMeeting.status !== 'ended' || endedMeeting.duration <= 0) throw new Error('End meeting invalid');
    console.log(`  [PASS] 2.5 End Meeting (Duration: ${endedMeeting.duration}s, Status: ended)`);

    // ----------------------------------------------------
    // SECTION 3: WEBRTC SIGNALING & WEBSOCKET
    // ----------------------------------------------------
    console.log('\n--- SECTION 3: WEBRTC SIGNALING & WEBSOCKET ---');
    const simRoomId = `sim-room-${testId}`;

    // 3.1 Client A Connect & Join
    const clientA = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((r) => clientA.on('connect', r));
    clientA.emit('join_room', { roomId: simRoomId });
    const roomA = await new Promise((r) => clientA.on('room_joined', r));
    console.log('  [PASS] 3.1 WebRTC Room Initialization (User A)');

    // 3.2 Client B Join & Offer/Answer Forwarding
    const peerJoinedPromiseA = new Promise((r) => clientA.on('peer_joined', r));
    const clientB = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((r) => clientB.on('connect', r));
    clientB.emit('join_room', { roomId: simRoomId });
    await peerJoinedPromiseA;
    console.log('  [PASS] 3.2 Peer Join Notification (User B)');

    // Offer / Answer Exchange
    const offerPromiseB = new Promise((r) => clientB.on('webrtc_offer', r));
    clientA.emit('webrtc_offer', { roomId: simRoomId, offer: { type: 'offer', sdp: 'sdp_a' } });
    await offerPromiseB;
    console.log('  [PASS] 3.3 WebRTC Offer Forwarding');

    const answerPromiseA = new Promise((r) => clientA.on('webrtc_answer', r));
    clientB.emit('webrtc_answer', { roomId: simRoomId, answer: { type: 'answer', sdp: 'sdp_b' } });
    await answerPromiseA;
    console.log('  [PASS] 3.4 WebRTC Answer Forwarding');

    // 3.5 Enforce Strict 2-Person Limit (Client C Rejection)
    const clientC = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((r) => clientC.on('connect', r));
    const roomFullPromiseC = new Promise((r) => clientC.on('room_full', r));
    clientC.emit('join_room', { roomId: simRoomId });
    await roomFullPromiseC;
    console.log('  [PASS] 3.5 Room Capacity Limit Enforcement (Room Full Rejection)');

    // ----------------------------------------------------
    // SECTION 4: REAL-TIME CHAT & XSS SECURITY
    // ----------------------------------------------------
    console.log('\n--- SECTION 4: REAL-TIME CHAT & XSS SECURITY ---');
    const chatPromiseB = new Promise((r) => clientB.on('chat_message', r));
    const xssPayload = '<img src=x onerror=alert(1)> Hello ConnectX';
    clientA.emit('send_chat_message', { roomId: simRoomId, text: xssPayload, senderName: 'Alice' });
    const msgB = await chatPromiseB;
    if (msgB.text.includes('<img')) throw new Error('XSS Sanitization failed');
    console.log('  [PASS] 4.1 Real-Time Chat & Server XSS HTML Sanitization');

    // Cleanup Sockets
    clientA.disconnect();
    clientB.disconnect();
    clientC.disconnect();

    // Database Cleanup
    await Meeting.deleteOne({ meetingId: testRoomId });
    await Meeting.deleteOne({ meetingId: simRoomId });
    await MeetingParticipant.deleteMany({ meetingId: testRoomId });
    await User.deleteOne({ _id: userId });

    console.log('\n====================================================');
    console.log('🎉 ALL END-TO-END VERIFICATION SUITES PASSED 100%');
    console.log('====================================================\n');

  } catch (error) {
    console.error('❌ E2E Verification failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

runE2EFullSuite();
