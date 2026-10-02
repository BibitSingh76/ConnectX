const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const { Meeting, MeetingParticipant, User } = require('./src/models');
const { connectDB, disconnectDB } = require('./src/config/db');
const meetingService = require('./src/services/meetingService');

const runTests = async () => {
  console.log('--- Phase 1: MongoDB Meeting Persistence Test ---');

  try {
    await connectDB();

    const testId = `test-${Date.now()}`;
    const testMeetingId = `room-${Math.random().toString(36).substring(2, 8)}`;

    // A. Create User
    console.log('\n[A] Registering Test User...');
    const user = await User.create({
      name: `Test Host ${testId}`,
      email: `${testId}@example.com`,
      passwordHash: 'hashedpassword123',
    });
    console.log(`✓ User created: ID ${user._id}, Name: ${user.name}`);

    // B & C. Create Meeting
    console.log('\n[B & C] Creating Meeting document...');
    const meeting = await meetingService.createMeeting({
      meetingId: testMeetingId,
      title: 'Phase 1 Verification Call',
      hostId: user._id,
      hostName: user.name,
    });
    console.log(`✓ Meeting created in MongoDB: meetingId: ${meeting.meetingId}, status: ${meeting.status}`);

    const dbMeeting = await Meeting.findOne({ meetingId: testMeetingId });
    if (!dbMeeting) throw new Error('Meeting not found in MongoDB!');
    console.log(`✓ MongoDB Verification: Document ID ${dbMeeting._id}, Host ID ${dbMeeting.host}`);

    // D & E. Join Meeting as Participant (Guest)
    console.log('\n[D & E] Joining meeting as guest participant...');
    const joinedMeeting = await meetingService.joinMeeting({
      meetingId: testMeetingId,
      displayName: 'Guest Participant Alex',
    });
    console.log(`✓ Participant added. Total participants in meeting: ${joinedMeeting.participants.length}`);

    const participants = await MeetingParticipant.find({ meetingId: testMeetingId });
    console.log(`✓ MongoDB Participants count: ${participants.length}`);
    participants.forEach((p, idx) => {
      console.log(`   [Participant ${idx + 1}] Name: ${p.displayName}, Role: ${p.role}, Status: ${p.status}, JoinedAt: ${p.joinedAt}`);
    });

    // F. Participant Leave
    console.log('\n[F] Participant leaving meeting...');
    await meetingService.leaveMeeting({
      meetingId: testMeetingId,
      displayName: 'Guest Participant Alex',
    });
    const leftParticipant = await MeetingParticipant.findOne({ meetingId: testMeetingId, displayName: 'Guest Participant Alex' });
    console.log(`✓ Participant left state: status = ${leftParticipant.status}, leftAt = ${leftParticipant.leftAt}`);

    // G & H. End Meeting
    console.log('\n[G & H] Ending meeting...');
    // Wait 2 seconds so duration is > 0
    await new Promise((r) => setTimeout(r, 2000));
    const endedMeeting = await meetingService.endMeeting(testMeetingId, user._id);

    console.log(`✓ Meeting Ended Status: ${endedMeeting.status}`);
    console.log(`✓ Ended At: ${endedMeeting.endTime}`);
    console.log(`✓ Computed Duration: ${endedMeeting.duration} seconds`);

    if (endedMeeting.status !== 'ended' || !endedMeeting.endTime || typeof endedMeeting.duration !== 'number') {
      throw new Error('Ended meeting validation failed!');
    }

    // Cleanup test data
    await Meeting.deleteOne({ meetingId: testMeetingId });
    await MeetingParticipant.deleteMany({ meetingId: testMeetingId });
    await User.deleteOne({ _id: user._id });
    console.log('\n✓ Test data cleaned up cleanly.');

    console.log('\n=============================================');
    console.log('🎉 ALL PHASE 1 PERSISTENCE TESTS PASSED 100%');
    console.log('=============================================\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

runTests();
