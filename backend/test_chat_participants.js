const io = require('../frontend/node_modules/socket.io-client');

const SOCKET_URL = 'http://localhost:5000';

const runChatTests = async () => {
  console.log('--- Phase 3: Real-Time Chat & Participant List Test ---');

  const roomId = `room-chat-${Date.now()}`;
  let clientA, clientB;

  try {
    // 1. Connect Client A & Join Room
    console.log('\n[1] Client A connecting and joining room...');
    clientA = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((r) => clientA.on('connect', r));
    clientA.emit('join_room', { roomId });
    const roomA = await new Promise((r) => clientA.on('room_joined', r));
    console.log(`✓ Client A joined: count = ${roomA.participantsCount}`);

    // Listen for peer_joined on Client A
    const peerJoinedPromiseA = new Promise((r) => clientA.on('peer_joined', r));

    // 2. Connect Client B & Join Room
    console.log('\n[2] Client B connecting and joining room...');
    clientB = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((r) => clientB.on('connect', r));
    clientB.emit('join_room', { roomId });

    const roomB = await new Promise((r) => clientB.on('room_joined', r));
    console.log(`✓ Client B joined: count = ${roomB.participantsCount}`);

    const peerJoinedNoticeA = await peerJoinedPromiseA;
    console.log(`✓ Participant joined event received by Client A for socket ${peerJoinedNoticeA.socketId}`);

    // 3. Test Real-Time Chat & HTML Sanitization
    console.log('\n[3] Testing Chat Message & HTML Sanitization...');
    const chatPromiseB = new Promise((r) => clientB.on('chat_message', r));
    const maliciousText = '<script>alert("xss")</script> Hello <b>World</b>';
    clientA.emit('send_chat_message', { roomId, text: maliciousText, senderName: 'Alice' });

    const receivedMessageB = await chatPromiseB;
    console.log(`✓ Client B received chat message from ${receivedMessageB.senderName}`);
    console.log(`✓ Original text: "${maliciousText}"`);
    console.log(`✓ Sanitized text: "${receivedMessageB.text}"`);

    if (receivedMessageB.text.includes('<script>') || receivedMessageB.text.includes('<b>')) {
      throw new Error('HTML sanitization failed!');
    }
    console.log('✓ XSS HTML Sanitization confirmed working.');

    // 4. Test Participant Left Event & Accurate Count
    console.log('\n[4] Testing Participant Left Event...');
    const peerLeftPromiseA = new Promise((r) => clientA.on('peer_left', r));
    clientB.disconnect();

    const peerLeftNoticeA = await peerLeftPromiseA;
    console.log(`✓ Participant left event received by Client A: "${peerLeftNoticeA.message}"`);

    console.log('\n=============================================');
    console.log('🎉 ALL PHASE 3 CHAT & PARTICIPANT TESTS PASSED');
    console.log('=============================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exitCode = 1;
  } finally {
    if (clientA) clientA.disconnect();
    if (clientB) clientB.disconnect();
  }
};

runChatTests();
