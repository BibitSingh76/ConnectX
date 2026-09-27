const io = require('../frontend/node_modules/socket.io-client');

const SOCKET_URL = 'http://localhost:5000';

const runWebRTCTests = async () => {
  console.log('--- Phase 2: WebRTC Reliability & Signaling Test ---');

  const roomId = `room-phase2-${Date.now()}`;
  let clientA, clientB, clientC;

  try {
    // 1. Connect Client A
    console.log('\n[1] Connecting Client A...');
    clientA = io(SOCKET_URL, { transports: ['websocket'] });

    await new Promise((resolve) => clientA.on('connect', resolve));
    console.log(`✓ Client A connected with socket ID: ${clientA.id}`);

    // 2. Client A Joins Room
    console.log('\n[2] Client A creating/joining room:', roomId);
    clientA.emit('join_room', { roomId });

    const roomJoinedA = await new Promise((resolve) => clientA.on('room_joined', resolve));
    console.log(`✓ Client A room_joined received: isInitiator=${roomJoinedA.isInitiator}, count=${roomJoinedA.participantsCount}`);

    if (!roomJoinedA.isInitiator || roomJoinedA.participantsCount !== 1) {
      throw new Error('Client A room_joined payload invalid');
    }

    // 3. Connect Client B
    console.log('\n[3] Connecting Client B...');
    clientB = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((resolve) => clientB.on('connect', resolve));
    console.log(`✓ Client B connected with socket ID: ${clientB.id}`);

    // Set up peer_joined listener on Client A
    const peerJoinedPromiseA = new Promise((resolve) => clientA.on('peer_joined', resolve));

    // Client B Joins Room
    console.log('\n[4] Client B joining room:', roomId);
    clientB.emit('join_room', { roomId });

    const roomJoinedB = await new Promise((resolve) => clientB.on('room_joined', resolve));
    console.log(`✓ Client B room_joined received: isInitiator=${roomJoinedB.isInitiator}, count=${roomJoinedB.participantsCount}`);

    const peerJoinedA = await peerJoinedPromiseA;
    console.log(`✓ Client A received peer_joined notification: socketId=${peerJoinedA.socketId}`);

    if (peerJoinedA.socketId !== clientB.id) {
      throw new Error('Client A received wrong peer socket ID');
    }

    // 4. Test Room Capacity Limit (Client C)
    console.log('\n[5] Testing 2-Participant Limit with Client C...');
    clientC = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((resolve) => clientC.on('connect', resolve));

    const roomFullPromiseC = new Promise((resolve) => clientC.on('room_full', resolve));
    clientC.emit('join_room', { roomId });
    const roomFullNotice = await roomFullPromiseC;
    console.log(`✓ Client C correctly denied entry with room_full: "${roomFullNotice.message}"`);

    // 5. Offer / Answer / ICE Candidate Forwarding Test
    console.log('\n[6] Testing WebRTC Offer/Answer/ICE Candidate Signaling...');
    const fakeOffer = { type: 'offer', sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1...' };
    const fakeAnswer = { type: 'answer', sdp: 'v=0\r\no=- 67890 2 IN IP4 127.0.0.1...' };
    const fakeCandidate = { candidate: 'candidate:1 1 UDP 2122260223 127.0.0.1 54321 typ host', sdpMid: '0', sdpMLineIndex: 0 };

    const offerPromiseB = new Promise((resolve) => clientB.on('webrtc_offer', resolve));
    clientA.emit('webrtc_offer', { roomId, offer: fakeOffer });
    const receivedOfferB = await offerPromiseB;
    console.log('✓ Client B received forwarded WebRTC offer from Client A');

    const answerPromiseA = new Promise((resolve) => clientA.on('webrtc_answer', resolve));
    clientB.emit('webrtc_answer', { roomId, answer: fakeAnswer });
    const receivedAnswerA = await answerPromiseA;
    console.log('✓ Client A received forwarded WebRTC answer from Client B');

    const candidatePromiseB = new Promise((resolve) => clientB.on('ice_candidate', resolve));
    clientA.emit('ice_candidate', { roomId, candidate: fakeCandidate });
    const receivedCandidateB = await candidatePromiseB;
    console.log('✓ Client B received forwarded ICE candidate from Client A');

    // 6. Test Disconnect & Cleanup
    console.log('\n[7] Testing Disconnect & peer_left Event...');
    const peerLeftPromiseA = new Promise((resolve) => clientA.on('peer_left', resolve));
    clientB.disconnect();
    const peerLeftA = await peerLeftPromiseA;
    console.log(`✓ Client A received peer_left event after Client B disconnect: "${peerLeftA.message}"`);

    console.log('\n=============================================');
    console.log('🎉 ALL PHASE 2 WEBRTC RELIABILITY TESTS PASSED 100%');
    console.log('=============================================\n');

  } catch (error) {
    console.error('❌ WebRTC Test failed:', error);
    process.exitCode = 1;
  } finally {
    if (clientA) clientA.disconnect();
    if (clientB) clientB.disconnect();
    if (clientC) clientC.disconnect();
  }
};

runWebRTCTests();
