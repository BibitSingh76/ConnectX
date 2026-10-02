import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.currentRoomId = null;
    this.lastMediaStatus = null;
    this.isJoined = false;
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
        if (this.currentRoomId) {
          console.log(`[SocketService] Auto-rejoining room [${this.currentRoomId}] on connect`);
          this.socket.emit('join_room', { roomId: this.currentRoomId });
          this.isJoined = true;
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('[SocketService] Connection error:', error);
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('[SocketService] Disconnected:', reason);
        this.isJoined = false;
      });
    } else if (this.socket.disconnected) {
      console.log('[SocketService] Reconnecting existing socket instance...');
      this.socket.connect();
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      if (this.currentRoomId) {
        this.leaveRoom(this.currentRoomId);
      }
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.currentRoomId = null;
      this.lastMediaStatus = null;
      this.isJoined = false;
    }
  }

  joinRoom(roomId) {
    if (!roomId) return;
    if (this.currentRoomId === roomId && this.isJoined && this.socket && this.socket.connected) {
      console.log(`[SocketService] Already joined room [${roomId}], skipping duplicate join_room emit`);
      return;
    }
    this.currentRoomId = roomId;
    this.isJoined = true;
    if (this.socket) {
      if (this.socket.disconnected) {
        this.connect();
      } else {
        this.socket.emit('join_room', { roomId });
      }
    }
  }

  leaveRoom(roomId) {
    const targetRoom = roomId || this.currentRoomId;
    if (this.socket && targetRoom && this.isJoined) {
      this.socket.emit('leave_room', { roomId: targetRoom });
    }
    this.currentRoomId = null;
    this.lastMediaStatus = null;
    this.isJoined = false;
  }

  sendChatMessage(roomId, text, senderName) {
    if (this.socket && text && text.trim()) {
      this.socket.emit('send_chat_message', { roomId, text: text.trim(), senderName });
    }
  }

  sendMediaStatus(roomId, isMicOn, isCamOn) {
    if (!this.socket || !roomId) return;
    const micState = !!isMicOn;
    const camState = !!isCamOn;

    // Deduplicate identical media status emissions
    if (
      this.lastMediaStatus &&
      this.lastMediaStatus.roomId === roomId &&
      this.lastMediaStatus.isMicOn === micState &&
      this.lastMediaStatus.isCamOn === camState
    ) {
      return;
    }

    this.lastMediaStatus = { roomId, isMicOn: micState, isCamOn: camState };
    this.socket.emit('media_status_change', { roomId, isMicOn: micState, isCamOn: camState });
  }

  sendOffer(roomId, offer) {
    if (this.socket && offer) {
      this.socket.emit('webrtc_offer', { roomId, offer });
    }
  }

  sendAnswer(roomId, answer) {
    if (this.socket && answer) {
      this.socket.emit('webrtc_answer', { roomId, answer });
    }
  }

  sendIceCandidate(roomId, candidate) {
    if (this.socket && candidate) {
      this.socket.emit('ice_candidate', { roomId, candidate });
    }
  }

  on(event, callback) {
    if (this.socket && typeof callback === 'function') {
      // Deduplicate listener registration by unbinding first
      this.socket.off(event, callback);
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      if (typeof callback === 'function') {
        this.socket.off(event, callback);
      } else {
        console.warn(`[SocketService] Warning: socketService.off('${event}') called without callback reference.`);
      }
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
