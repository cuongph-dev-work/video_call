'use client';

import type { Socket } from 'socket.io-client';
import type { Participant, Message } from '../types';
import type { WaitingUser, ParticipantState } from '@video-call/types';
import type { useRoomStore } from '../stores/useRoomStore';

type RoomStore = ReturnType<typeof useRoomStore.getState>;

/**
 * Centralized socket event manager for room
 * All socket logic in ONE place for clarity and maintainability
 */
export class RoomSocketManager {
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private roomStore: RoomStore;
  private onChatMessage?: (message: Message) => void;

  constructor(roomStore: RoomStore, onChatMessage?: (message: Message) => void) {
    this.roomStore = roomStore;
    this.onChatMessage = onChatMessage;
  }

  /**
   * Initialize socket listeners (call once per room)
   */
  initialize(socket: Socket, roomId: string) {
    // Check if socket has changed (e.g., due to HMR)
    const socketChanged = this.socket && this.socket !== socket;
    
    if (socketChanged) {
      this.cleanup(); // Remove listeners from old socket
    }

    // Only setup listeners if socket changed or first time
    if (socketChanged || !this.socket) {
      this.socket = socket;
      this.roomId = roomId;
      this.setupListeners();
    }
  }

  /**
   * Setup all socket event listeners
   */
  private setupListeners() {
    if (!this.socket) return;

    // Use onAny to safely handle events across HMR updates
    this.socket.onAny(this.handleAnyEvent);
  }

  /**
   * Centralized event handler
   */
  private handleAnyEvent = (eventName: string, data: any) => {
    switch (eventName) {
      case 'room-joined':
        this.handleRoomJoined(data);
        break;
      case 'user-joined':
        this.handleUserJoined(data);
        break;
      case 'user-left':
        this.handleUserLeft(data);
        break;
      case 'participant:state-changed':
        this.handleParticipantState(data);
        break;
      case 'participant-quality-changed':
        this.handleQualityChanged(data);
        break;
      case 'user-waiting':
        this.handleUserWaiting(data);
        break;
      case 'waiting-count-updated':
        this.handleWaitingCountUpdate();
        break;
      case 'waiting-users-list':
        this.handleWaitingUsersList(data);
        break;
      case 'chat-message':
        this.handleChatMessage(data);
        break;
    }
  };

  // ============================================
  // EVENT HANDLERS (update store directly)
  // ============================================

  private handleRoomJoined = (data: { roomId: string; participants: Participant[] }) => {
    this.roomStore.setParticipants(data.participants);
    this.roomStore.setJoined(true);
  };

  private handleUserJoined = (data: { participant: Participant }) => {
    this.roomStore.addParticipant(data.participant);
  };

  private handleUserLeft = (data: { userId: string; wasHost?: boolean }) => {
    this.roomStore.removeParticipant(data.userId);
    this.roomStore.removeRemoteStream(data.userId);
  };

  private handleParticipantState = (data: {
    userId: string;
    state: ParticipantState;
    timestamp: number;
  }) => {
    this.roomStore.updateParticipantState(data.userId, data.state);
  };

  private handleQualityChanged = (data: {
    userId: string;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    timestamp: number;
  }) => {
    this.roomStore.updateParticipantState(data.userId, {
      connectionQuality: data.quality,
    });
  };

  private handleUserWaiting = (data: { user: WaitingUser; waitingCount: number }) => {
    this.roomStore.addWaitingUser(data.user);
  };

  private handleWaitingCountUpdate = () => {
    // Request updated list
    this.getWaitingUsers();
  };

  private handleWaitingUsersList = (data: { roomId: string; users: WaitingUser[] }) => {
    this.roomStore.setWaitingUsers(data.users);
  };

  private handleChatMessage = (message: Message) => {
    this.onChatMessage?.(message);
  };

  // ============================================
  // EMIT METHODS (public API)
  // ============================================

  joinRoom(userId: string, options: { displayName: string; audioEnabled: boolean; videoEnabled: boolean }) {
    if (!this.socket || !this.roomId) {
      return;
    }

    this.socket.emit('join-room', {
      roomId: this.roomId,
      userId,
      displayName: options.displayName,
      audioEnabled: options.audioEnabled,
      videoEnabled: options.videoEnabled,
    });
  }

  leaveRoom() {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('leave-room', { roomId: this.roomId });
  }

  updateState(state: ParticipantState) {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('participant:state', {
      roomId: this.roomId,
      state,
    });
  }

  sendMessage(content: string, senderId: string, senderName: string) {
    if (!this.socket || !this.roomId) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId,
      senderName,
      content,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    this.socket.emit('chat-message', { roomId: this.roomId, message });

    // Add to own chat store
    this.onChatMessage?.(message);
  }

  admitUser(userId: string) {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('admit-user', { roomId: this.roomId, userId });
    this.roomStore.removeWaitingUser(userId);
  }

  rejectUser(userId: string, reason?: string) {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('reject-user', {
      roomId: this.roomId,
      userId,
      reason: reason || 'Access denied',
    });
    this.roomStore.removeWaitingUser(userId);
  }

  getWaitingUsers() {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('get-waiting-users', { roomId: this.roomId });
  }

  reportConnectionQuality(quality: 'excellent' | 'good' | 'fair' | 'poor') {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('connection-quality', {
      roomId: this.roomId,
      quality,
    });
  }

  cleanup() {
    if (!this.socket) {
      return;
    }

    // Remove the global event listener
    this.socket.offAny(this.handleAnyEvent);

    this.socket = null;
    this.roomId = null;
  }
}
