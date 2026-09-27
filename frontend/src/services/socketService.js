import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.currentRoomId = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        autoConnect: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('[SocketService] Connected to signaling server:', this.socket.id);
      });

      // Handle socket reconnection & auto-rejoin room
      this.socket.io.on('reconnect', (attempt) => {
        console.log(`[SocketService] Reconnected on attempt ${attempt}`);
        if (this.currentRoomId) {
          console.log(`[SocketService] Auto-rejoining room [${this.currentRoomId}] after reconnect`);
          this.socket.emit('join_room', { roomId: this.currentRoomId });
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('[SocketService] Connection error:', error);
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('[SocketService] Disconnected:', reason);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRoomId = null;
    }
  }

  joinRoom(roomId) {
    this.currentRoomId = roomId;
    if (this.socket) {
      this.socket.emit('join_room', { roomId });
    }
  }

  leaveRoom(roomId) {
    if (this.socket) {
      this.socket.emit('leave_room', { roomId });
    }
    this.currentRoomId = null;
  }

  sendChatMessage(roomId, text, senderName) {
    if (this.socket) {
      this.socket.emit('send_chat_message', { roomId, text, senderName });
    }
  }

  sendMediaStatus(roomId, isMicOn, isCamOn) {
    if (this.socket) {
      this.socket.emit('media_status_change', { roomId, isMicOn, isCamOn });
    }
  }

  sendOffer(roomId, offer) {
    if (this.socket) {
      this.socket.emit('webrtc_offer', { roomId, offer });
    }
  }

  sendAnswer(roomId, answer) {
    if (this.socket) {
      this.socket.emit('webrtc_answer', { roomId, answer });
    }
  }

  sendIceCandidate(roomId, candidate) {
    if (this.socket) {
      this.socket.emit('ice_candidate', { roomId, candidate });
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  get socketId() {
    return this.socket ? this.socket.id : null;
  }
}

const socketService = new SocketService();
export default socketService;
