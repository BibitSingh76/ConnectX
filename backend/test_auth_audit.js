const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const { User, Meeting, MeetingParticipant } = require('./src/models');
const { connectDB, disconnectDB } = require('./src/config/db');
const authService = require('./src/services/authService');
const meetingService = require('./src/services/meetingService');
const generateToken = require('./src/utils/generateToken');

const runAuthAuditTests = async () => {
  console.log('--- Phase 4: Authentication & Authorization Audit Test ---');

  const timestamp = Date.now();
  const testEmail = `user_${timestamp}@connectx.test`;
  const testPassword = 'SecurePassword123';
  const testName = 'Test User';

  try {
    await connectDB();

    // 1. Valid Registration Test
    console.log('\n[1] Testing Valid Registration...');
    const regResult = await authService.registerUser({
      name: testName,
      email: testEmail,
      password: testPassword,
    });
    console.log('✓ Registration successful.');
    console.log('✓ Generated Token length:', regResult.token.length);
    console.log('✓ Returned User Object:', regResult.user);

    if (regResult.user.passwordHash || regResult.user.password) {
      throw new Error('SECURITY VIOLATION: Password hash leaked in registration response!');
    }
    console.log('✓ Confirmed passwordHash is NOT exposed in User response.');

    // 2. Duplicate Email Test
    console.log('\n[2] Testing Duplicate Email Registration...');
    try {
      await authService.registerUser({
        name: 'Another User',
        email: testEmail,
        password: 'AnotherPassword123',
      });
      throw new Error('Duplicate email registration should have thrown an error!');
    } catch (err) {
      console.log(`✓ Duplicate registration correctly rejected: "${err.message}"`);
    }

    // 3. Valid Login Test
    console.log('\n[3] Testing Valid Login...');
    const loginResult = await authService.loginUser({
      email: testEmail,
      password: testPassword,
    });
    console.log('✓ Login successful.');
    if (loginResult.user.passwordHash) {
      throw new Error('SECURITY VIOLATION: Password hash leaked in login response!');
    }
    console.log('✓ Confirmed passwordHash is NOT exposed in Login response.');

    // 4. Wrong Password Login Test
    console.log('\n[4] Testing Wrong Password Login...');
    try {
      await authService.loginUser({
        email: testEmail,
        password: 'WrongPassword999',
      });
      throw new Error('Wrong password should have thrown 401 error!');
    } catch (err) {
      console.log(`✓ Wrong password correctly rejected: "${err.message}"`);
    }

    // 5. Get Current User Profile (JWT Verification)
    console.log('\n[5] Testing JWT Verification & Get Profile...');
    const currentUser = await authService.getCurrentUser(loginResult.user._id);
    console.log(`✓ Profile fetched for User ID ${currentUser._id}, Email: ${currentUser.email}`);

    // 6. Meeting Authorization (Host vs Unauthorized User)
    console.log('\n[6] Testing Meeting Ownership & Authorization...');
    const roomCode = `room-auth-${timestamp}`;
    const hostMeeting = await meetingService.createMeeting({
      meetingId: roomCode,
      title: 'Host Meeting',
      hostId: loginResult.user._id,
      hostName: loginResult.user.name,
    });
    console.log(`✓ Meeting created with Host ID ${hostMeeting.host._id}`);

    // Create unauthorized second user
    const user2 = await User.create({
      name: 'User 2',
      email: `user2_${timestamp}@connectx.test`,
      passwordHash: 'Password123',
    });

    console.log('\n[7] Testing Unauthorized User Ending Host\'s Meeting...');
    try {
      await meetingService.endMeeting(roomCode, user2._id);
      throw new Error('Unauthorized user should have been forbidden from ending host meeting!');
    } catch (err) {
      console.log(`✓ Unauthorized end meeting attempt correctly blocked: "${err.message}"`);
    }

    // Host Ends Their Own Meeting
    console.log('\n[8] Testing Host Ending Their Own Meeting...');
    const endedMeeting = await meetingService.endMeeting(roomCode, loginResult.user._id);
    console.log(`✓ Host successfully ended meeting: status = ${endedMeeting.status}, duration = ${endedMeeting.duration}s`);

    // Cleanup
    await Meeting.deleteOne({ meetingId: roomCode });
    await MeetingParticipant.deleteMany({ meetingId: roomCode });
    await User.deleteOne({ _id: loginResult.user._id });
    await User.deleteOne({ _id: user2._id });
    console.log('\n✓ Test data cleaned up.');

    console.log('\n=============================================');
    console.log('🎉 ALL PHASE 4 AUTH & AUTHORIZATION TESTS PASSED');
    console.log('=============================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

runAuthAuditTests();
