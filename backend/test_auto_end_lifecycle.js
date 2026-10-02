const http = require('http');
const express = require('express');
const app = require('./src/app');
const setupSignaling = require('./src/socket/signaling');
const { Server } = require('socket.io');
const ioClient = require('../frontend/node_modules/socket.io-client');
const { connectDB, disconnectDB } = require('./src/config/db');
const { User, Meeting, MeetingParticipant } = require('./src/models');
const { meetingService, authService } = require('./src/services');

const runLifecycleTest = async () => {
  console.log('====================================================');
  console.log('🚀 TESTING MEETING LIFECYCLE AUTO-END VIA SOCKET.IO');
  console.log('====================================================\n');

  let server;
  let ioServer;
  const PORT = 5089;

  try {
    await connectDB();
    server = http.createServer(app);
    ioServer = new Server(server, {
      cors: { origin: '*' },
    });
    setupSignaling(ioServer);

    await new Promise((r) => server.listen(PORT, r));
    console.log(`✓ Test Socket.IO server running on port ${PORT}\n`);

    const timestamp = Date.now();
    const testRoomId = `room-lifecycle-${timestamp}`;

    // 1. Create User & Meeting
    console.log('[1] Creating Host User & Active Meeting...');
    const hostUser = await authService.registerUser({
      name: 'Lifecycle Host',
      email: `lifecycle_${timestamp}@connectx.test`,
      password: 'Password123!',
    });

    const meeting = await meetingService.createMeeting({
      meetingId: testRoomId,
      title: 'Lifecycle Call',
      hostId: hostUser.user._id,
      hostName: hostUser.user.name,
    });

    if (meeting.status !== 'active') {
      throw new Error('Newly created meeting status must be active');
    }
    console.log(`✓ Meeting created in MongoDB with status: ${meeting.status}\n`);

    // 2. Connect Socket Client A (Host)
    console.log('[2] Connecting Socket A and joining room...');
    const socketA = ioClient(`http://localhost:${PORT}`, { transports: ['websocket'] });
    await new Promise((r) => socketA.on('connect', r));

    socketA.emit('join_room', { roomId: testRoomId });
    await new Promise((r) => socketA.on('room_joined', r));
    console.log('✓ Socket A joined room.');

    // 3. Connect Socket Client B (Participant)
    console.log('[3] Connecting Socket B and joining room...');
    const socketB = ioClient(`http://localhost:${PORT}`, { transports: ['websocket'] });
    await new Promise((r) => socketB.on('connect', r));

    const peerJoinedA = new Promise((r) => socketA.on('peer_joined', r));
    socketB.emit('join_room', { roomId: testRoomId });
    await new Promise((r) => socketB.on('room_joined', r));
    await peerJoinedA;
    console.log('✓ Socket B joined room (2 participants active).\n');

    // 4. Socket A Leaves (1 participant remaining)
    console.log('[4] Socket A leaves room (Socket B still present)...');
    const peerLeftB = new Promise((r) => socketB.on('peer_left', r));
    socketA.emit('leave_room');
    await peerLeftB;
    console.log('✓ Socket B received peer_left event.');

    // Wait 500ms to verify MongoDB state
    await new Promise((r) => setTimeout(r, 500));
    const meetingAfterA = await Meeting.findOne({ meetingId: testRoomId }).lean();
    console.log(`✓ MongoDB Meeting Status while Socket B is still in room: ${meetingAfterA.status}`);
    if (meetingAfterA.status !== 'active') {
      throw new Error('Meeting MUST stay active when 1 participant is still in room!');
    }
    console.log('✓ PASS: Meeting remains active while Socket B is present.\n');

    // 5. Socket B Disconnects / Leaves (0 participants remaining)
    console.log('[5] Socket B disconnects (Last participant leaving)...');
    await new Promise((r) => setTimeout(r, 1200)); // Sleep to get duration > 1 sec
    socketB.disconnect();

    // Wait 500ms for asynchronous auto-end DB update to finish
    await new Promise((r) => setTimeout(r, 500));

    const finalMeeting = await Meeting.findOne({ meetingId: testRoomId }).lean();
    console.log(`✓ MongoDB Meeting Status after last socket leaves: ${finalMeeting.status}`);
    console.log(`✓ End Time: ${finalMeeting.endTime}`);
    console.log(`✓ Duration (Seconds): ${finalMeeting.duration}`);

    if (finalMeeting.status !== 'ended') {
      throw new Error('Meeting status MUST be "ended" after last socket leaves!');
    }
    if (!finalMeeting.endTime || finalMeeting.duration <= 0) {
      throw new Error('Meeting endTime and duration must be set properly!');
    }
    console.log('✓ PASS: Meeting automatically transitioned to "ended" with correct duration.\n');

    // 6. Test Idempotence (Calling autoEndMeeting again)
    console.log('[6] Testing Idempotence (Duplicate auto-end attempt)...');
    const firstEndTime = finalMeeting.endTime.getTime();
    const firstDuration = finalMeeting.duration;

    await new Promise((r) => setTimeout(r, 1000));
    await meetingService.autoEndMeeting(testRoomId);

    const reCheckedMeeting = await Meeting.findOne({ meetingId: testRoomId }).lean();
    if (
      reCheckedMeeting.endTime.getTime() !== firstEndTime ||
      reCheckedMeeting.duration !== firstDuration
    ) {
      throw new Error('Idempotence violation: Duplicate auto-end modified original endTime/duration!');
    }
    console.log('✓ PASS: Duplicate auto-end attempt did not modify original endTime/duration.\n');

    // Cleanup
    socketA.disconnect();
    await Meeting.deleteOne({ meetingId: testRoomId });
    await MeetingParticipant.deleteMany({ meetingId: testRoomId });
    await User.deleteOne({ _id: hostUser.user._id });

    console.log('====================================================');
    console.log('🎉 ALL AUTO-END LIFECYCLE TESTS PASSED 100%');
    console.log('====================================================\n');

  } catch (error) {
    console.error('❌ Lifecycle test failed:', error);
    process.exitCode = 1;
  } finally {
    if (ioServer) ioServer.close();
    if (server) server.close();
    await disconnectDB();
  }
};

runLifecycleTest();
