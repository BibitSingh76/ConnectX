const logger = require('../utils/logger');

// Server-authoritative in-memory state tracking
const rooms = new Map(); // roomId -> Set<socketId>
const socketToRoom = new Map(); // socketId -> roomId

/**
 * Sanitize text inputs to prevent XSS injection
 */
const sanitizeText = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};

/**
 * Validate Room ID format (3 to 64 alphanumeric characters, hyphens, underscores)
 */
const isValidRoomId = (roomId) => {
  if (!roomId || typeof roomId !== 'string') return false;
  const re = /^[a-zA-Z0-9_-]{3,64}$/;
  return re.test(roomId.trim());
};

/**
 * Helper to remove a socket from its room and clean up empty rooms
 */
const removeSocketFromRoom = (socket, io) => {
  const socketId = socket.id;
  const roomId = socketToRoom.get(socketId);

  if (!roomId) return;

  const roomParticipants = rooms.get(roomId);
  if (roomParticipants) {
    roomParticipants.delete(socketId);
    socket.leave(roomId);
    logger.info(`Socket [${socketId}] safely removed from room [${roomId}]`);

    if (roomParticipants.size > 0) {
      socket.to(roomId).emit('peer_left', {
        socketId,
        message: 'The other participant left the call',
      });
    } else {
      rooms.delete(roomId);
      logger.info(`Room [${roomId}] cleaned up (0 participants remaining)`);
    }
  }

  socketToRoom.delete(socketId);
};

/**
 * Hardened Socket.io Signaling Module
 */
const setupSignaling = (io) => {
  io.on('connection', (socket) => {
    logger.info(`New client connected: [${socket.id}]`);

    // --- 1. Join Room ---
    socket.on('join_room', (data) => {
      const rawRoomId = data && typeof data === 'object' ? data.roomId : data;

      if (!isValidRoomId(rawRoomId)) {
        return socket.emit('error', {
          code: 'INVALID_ROOM_ID',
          message: 'Room ID must be 3-64 characters (alphanumeric, hyphens, underscores)',
        });
      }

      const roomId = rawRoomId.trim();

      if (socketToRoom.has(socket.id)) {
        removeSocketFromRoom(socket, io);
      }

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }

      const room = rooms.get(roomId);

      // Enforce strict server-authoritative 2-participant cap
      if (room.size >= 2) {
        logger.warn(`Socket [${socket.id}] denied access to full room [${roomId}]`);
        return socket.emit('room_full', {
          roomId,
          message: 'Room is full. Maximum 2 participants allowed.',
        });
      }

      room.add(socket.id);
      socketToRoom.set(socket.id, roomId);
      socket.join(roomId);

      const participantsCount = room.size;
      const isInitiator = participantsCount === 1;

      logger.info(`Socket [${socket.id}] authorized & joined room [${roomId}] (${participantsCount}/2)`);

      socket.emit('room_joined', {
        roomId,
        isInitiator,
        participantsCount,
      });

      if (participantsCount === 2) {
        socket.to(roomId).emit('peer_joined', {
          socketId: socket.id,
        });
      }
    });

    // --- 2. Sanitize & Broadcast Chat ---
    socket.on('send_chat_message', ({ roomId, text, senderName }) => {
      const activeRoom = socketToRoom.get(socket.id);
      if (!activeRoom || activeRoom !== roomId) {
        return socket.emit('error', {
          code: 'UNAUTHORIZED_ROOM_ACCESS',
          message: 'Unauthorized room manipulation attempt blocked',
        });
      }

      const cleanText = sanitizeText(text);
      if (!cleanText) return;

      const cleanSender = sanitizeText(senderName) || 'Peer';

      const messagePayload = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: socket.id,
        senderName: cleanSender,
        text: cleanText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      io.to(roomId).emit('chat_message', messagePayload);
    });

    // --- 3. Synchronize Media Status ---
    socket.on('media_status_change', ({ roomId, isMicOn, isCamOn }) => {
      const activeRoom = socketToRoom.get(socket.id);
      if (activeRoom === roomId) {
        socket.to(roomId).emit('peer_media_status', {
          socketId: socket.id,
          isMicOn: !!isMicOn,
          isCamOn: !!isCamOn,
        });
      }
    });

    // --- 4. WebRTC Offer Forwarding with Access Validation ---
    socket.on('webrtc_offer', ({ roomId, offer }) => {
      const activeRoom = socketToRoom.get(socket.id);
      if (!activeRoom || activeRoom !== roomId) {
        return socket.emit('error', {
          code: 'UNAUTHORIZED_ROOM_ACCESS',
          message: 'Unauthorized room signaling blocked',
        });
      }

      if (!offer) return;

      socket.to(roomId).emit('webrtc_offer', {
        offer,
        senderId: socket.id,
      });
    });

    // --- 5. WebRTC Answer Forwarding with Access Validation ---
    socket.on('webrtc_answer', ({ roomId, answer }) => {
      const activeRoom = socketToRoom.get(socket.id);
      if (!activeRoom || activeRoom !== roomId) {
        return socket.emit('error', {
          code: 'UNAUTHORIZED_ROOM_ACCESS',
          message: 'Unauthorized room signaling blocked',
        });
      }

      if (!answer) return;

      socket.to(roomId).emit('webrtc_answer', {
        answer,
        senderId: socket.id,
      });
    });

    // --- 6. ICE Candidate Forwarding with Access Validation ---
    socket.on('ice_candidate', ({ roomId, candidate }) => {
      const activeRoom = socketToRoom.get(socket.id);
      if (!activeRoom || activeRoom !== roomId) {
        return socket.emit('error', {
          code: 'UNAUTHORIZED_ROOM_ACCESS',
          message: 'Unauthorized candidate signaling blocked',
        });
      }

      if (!candidate) return;

      socket.to(roomId).emit('ice_candidate', {
        candidate,
        senderId: socket.id,
      });
    });

    // --- 7. Leave Room ---
    socket.on('leave_room', () => {
      removeSocketFromRoom(socket, io);
    });

    // --- 8. Handle Disconnect / Refresh ---
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: [${socket.id}], reason: ${reason}`);
      removeSocketFromRoom(socket, io);
    });
  });
};

module.exports = setupSignaling;
