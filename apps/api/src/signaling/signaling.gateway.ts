import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { RoomsService } from '../rooms/rooms.service';
import { WaitingRoomService } from '../rooms/waiting-room.service';
import { RoomSettingsService } from '../rooms/room-settings.service';

// WebRTC types for backend (matching browser API)
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class SignalingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SignalingGateway.name);
  private socketIdToUserId = new Map<string, string>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly waitingRoomService: WaitingRoomService,
    private readonly roomSettingsService: RoomSettingsService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get userId from socket, with fallback to socket.id
   */
  private getUserId(client: Socket): string {
    return this.socketIdToUserId.get(client.id) || client.id;
  }

  /**
   * Notify room about waiting queue updates
   */
  private async notifyWaitingRoomUpdate(roomId: string): Promise<void> {
    const waitingCount = await this.waitingRoomService.getWaitingCount(roomId);
    this.server.to(roomId).emit('waiting-count-updated', { waitingCount });

    const waitingUsers = await this.waitingRoomService.getWaitingUsers(roomId);
    this.server.to(roomId).emit('waiting-users-list', { roomId, users: waitingUsers });
  }

  /**
   * Disconnect old socket for same userId (handles F5 refresh)
   */
  private disconnectOldSocket(userId: string, currentSocketId: string): void {
    const existingSocketId = Array.from(this.socketIdToUserId.entries())
      .find(([socketId, uid]) => uid === userId && socketId !== currentSocketId)?.[0];
    
    if (existingSocketId) {
      this.socketIdToUserId.delete(existingSocketId);
      const oldSocket = this.server.sockets.sockets.get(existingSocketId);
      if (oldSocket) {
        oldSocket.disconnect(true);
      }
    }
  }

  /**
   * Centralized error handling
   */
  private handleError(client: Socket, error: unknown, context: string): void {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`${context}:`, error);
    client.emit('error', { code: message, message: `Failed to ${context}` });
  }

  // ============================================
  // CONNECTION LIFECYCLE
  // ============================================

  handleConnection(client: Socket) {
    // Connection established
  }

  async handleDisconnect(client: Socket) {
    const userId = this.getUserId(client);
    
    if (!this.socketIdToUserId.has(client.id)) {
      await this.roomsService.handleDisconnect(userId);
      return;
    }

    // Get the rooms this user is in before cleaning up
    const roomIds = await this.redis.smembers(`user:${userId}:rooms`);

    // Clean up session tracking
    for (const roomId of roomIds) {
      const sessionKey = `room:${roomId}:user:${userId}:sessions`;
      await this.redis.srem(sessionKey, client.id);
    }

    // Notify rooms about user leaving
    for (const roomId of roomIds) {
      const participants = await this.roomsService.getParticipants(roomId);
      const disconnectedUser = participants.find((p) => p.id === userId);
      const wasHost = disconnectedUser?.isHost || false;

      this.server.to(roomId).emit('user-left', { userId, wasHost });
    }

    // Clean up user from rooms and mappings
    await this.roomsService.handleDisconnect(userId);
    this.socketIdToUserId.delete(client.id);

    // Clean up from waiting queues
    try {
      const allRooms = await this.redis.keys('room:*:waiting');

      for (const key of allRooms) {
        const roomId = key.split(':')[1];
        const isWaiting = await this.waitingRoomService.isUserWaiting(roomId, userId);
        
        if (isWaiting) {
          await this.waitingRoomService.removeFromWaitingQueue(roomId, userId);
          await this.notifyWaitingRoomUpdate(roomId);
        }
      }
    } catch (error) {
      this.logger.error(`Error cleaning up waiting user ${userId}:`, error);
    }
  }

  // ============================================
  // ROOM MANAGEMENT
  // ============================================

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      userId: string;
      displayName: string;
      password?: string;
      audioEnabled?: boolean;
      videoEnabled?: boolean;
    }
  ) {
    try {
      const { roomId, userId, displayName, password, audioEnabled = true, videoEnabled = true } = data;

      // Check for duplicate session (multiple tabs)
      const sessionKey = `room:${roomId}:user:${userId}:sessions`;
      const existingSessions = await this.redis.smembers(sessionKey);
      
      // If there are existing sessions, check if they're still alive
      const activeSessions = [];
      for (const sessionId of existingSessions) {
        const socket = this.server.sockets.sockets.get(sessionId);
        if (socket && socket.connected) {
          activeSessions.push(sessionId);
        } else {
          // Clean up stale session
          await this.redis.srem(sessionKey, sessionId);
        }
      }

      // If there's an active session from a different socket, reject
      if (activeSessions.length > 0 && !activeSessions.includes(client.id)) {
        this.logger.warn(`Duplicate session attempt: userId=${userId}, roomId=${roomId}`);
        throw new Error('DUPLICATE_SESSION');
      }

      // Validate password if required
      const requiresPassword = await this.roomSettingsService.requiresPassword(roomId);
      if (requiresPassword) {
        if (!password) {
          throw new Error('PASSWORD_REQUIRED');
        }
        const isValid = await this.roomSettingsService.validatePassword(roomId, password);
        if (!isValid) {
          throw new Error('INVALID_PASSWORD');
        }
      }

      // Check if room is locked
      const isLocked = await this.roomSettingsService.isRoomLocked(roomId);
      if (isLocked) {
        throw new Error('ROOM_LOCKED');
      }

      // Join the room
      const participants = await this.roomsService.joinRoom(roomId, userId, {
        displayName,
        audioEnabled,
        videoEnabled,
      });
      
      // Handle F5 refresh: disconnect old socket with same userId
      this.disconnectOldSocket(userId, client.id);
      
      // Store socket ID to user ID mapping
      this.socketIdToUserId.set(client.id, userId);

      // Track this session in Redis
      await this.redis.sadd(sessionKey, client.id);
      await this.redis.expire(sessionKey, 3600); // 1 hour TTL

      // Join Socket.IO rooms
      await client.join(roomId);
      await client.join(userId);
      
      // Notify the user they've joined
      client.emit('room-joined', { roomId, participants });

      // Notify others in the room
      const newParticipant = {
        id: userId,
        displayName,
        audioEnabled,
        videoEnabled,
        isHost: participants.find((p) => p.id === userId)?.isHost || false,
      };
      
      client.to(roomId).emit('user-joined', { participant: newParticipant });
    } catch (error: unknown) {
      this.handleError(client, error, 'join room');
    }
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    const { roomId } = data;
    const userId = this.getUserId(client);

    // Check if leaving user is host
    const participants = await this.roomsService.getParticipants(roomId);
    const leavingParticipant = participants.find((p) => p.id === userId);
    const wasHost = leavingParticipant?.isHost || false;

    // Notify others before leaving
    client.to(roomId).emit('user-left', { userId, wasHost });

    await this.roomsService.leaveRoom(roomId, userId);
    void client.leave(roomId);
  }

  // ============================================
  // WEBRTC SIGNALING
  // ============================================

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; offer: RTCSessionDescriptionInit }
  ) {
    const fromUserId = this.getUserId(client);
    this.server.to(data.to).emit('offer', {
      from: fromUserId,
      offer: data.offer,
    });
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; answer: RTCSessionDescriptionInit }
  ) {
    const fromUserId = this.getUserId(client);
    this.server.to(data.to).emit('answer', {
      from: fromUserId,
      answer: data.answer,
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; candidate: RTCIceCandidateInit }
  ) {
    const fromUserId = this.getUserId(client);
    this.server.to(data.to).emit('ice-candidate', {
      from: fromUserId,
      candidate: data.candidate,
    });
  }

  //============================================
  // PARTICIPANT STATE MANAGEMENT
  // ============================================

  // TODO: Screen share functionality - temporarily disabled to focus on multi p2p
  // Uncomment when ready to implement
  /*
  @SubscribeMessage('screen-share-start')
  handleScreenShareStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; displayName: string }
  ) {
    const { roomId, displayName } = data;
    const userId = this.getUserId(client);
    client.to(roomId).emit('screen-share-started', { userId, displayName });
  }

  @SubscribeMessage('screen-share-stop')
  handleScreenShareStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    const { roomId } = data;
    const userId = this.getUserId(client);
    client.to(roomId).emit('screen-share-stopped', { userId });
  }
  */

  @SubscribeMessage('chat-message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      content: string;
      isPrivate: boolean;
      recipientId?: string;
    }
  ) {
    const userId = this.getUserId(client);
    const participants = await this.roomsService.getParticipants(data.roomId);
    const sender = participants.find((p) => p.id === userId);

    const message = {
      id: Date.now().toString(),
      senderId: userId,
      senderName: sender?.displayName || 'User',
      content: data.content,
      timestamp: new Date(),
      isPrivate: data.isPrivate,
      recipientId: data.recipientId,
    };

    if (data.isPrivate && data.recipientId) {
      // Send to specific user room (their UUID)
      this.server.to(data.recipientId).emit('chat-message', message);
      client.emit('chat-message', message); // Also send to sender
    } else {
      // Broadcast to room
      this.server.to(data.roomId).emit('chat-message', message);
    }
  }

  // ============================================
  // WAITING ROOM EVENTS
  // ============================================

  @SubscribeMessage('join-waiting-room')
  async handleJoinWaitingRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; userId: string; displayName: string },
  ) {
    try {
      const { roomId, userId, displayName } = data;

      // Join individual room for this user (to receive admitted/rejected events)
      void client.join(userId);
      // Store socket ID to user ID mapping
      this.socketIdToUserId.set(client.id, userId);

      // Add to waiting queue
      await this.waitingRoomService.addToWaitingQueue(
        roomId,
        userId,
        displayName,
      );

      // Notify user they're waiting
      client.emit('waiting-room-joined', {
        roomId,
        message: 'Waiting for host to admit you',
      });

      // Notify host/participants in room about new waiting user
      const waitingUser = {
        id: userId,
        displayName,
        joinedAt: new Date(),
      };

      const waitingCount =
        await this.waitingRoomService.getWaitingCount(roomId);

      // Emit to all in room
      this.server.to(roomId).emit('user-waiting', {
        user: waitingUser,
        waitingCount,
      });

      this.logger.debug(`${displayName} joined waiting room for ${roomId}`);
    } catch (error: unknown) {
      this.handleError(client, error, 'join waiting room');
    }
  }

  @SubscribeMessage('admit-user')
  async handleAdmitUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    try {
      const { roomId, userId } = data;

      // Check if user is in waiting queue
      const isWaiting = await this.waitingRoomService.isUserWaiting(
        roomId,
        userId,
      );

      if (!isWaiting) {
        throw new Error('User not in waiting queue');
      }

      // Remove from waiting queue
      await this.waitingRoomService.removeFromWaitingQueue(roomId, userId);

      // Notify the waiting user they've been admitted
      this.server.to(userId).emit('admitted', {
        roomId,
        message: 'You have been admitted to the room',
      });

      // Update waiting count
      await this.notifyWaitingRoomUpdate(roomId);

      this.logger.debug(`User ${userId} admitted to room ${roomId}`);
    } catch (error: unknown) {
      this.handleError(client, error, 'admit user');
    }
  }

  @SubscribeMessage('reject-user')
  async handleRejectUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; reason?: string },
  ) {
    try {
      const { roomId, userId, reason } = data;

      // Check if user is in waiting queue
      const isWaiting = await this.waitingRoomService.isUserWaiting(
        roomId,
        userId,
      );

      if (!isWaiting) {
        throw new Error('User not in waiting queue');
      }

      // Remove from waiting queue
      await this.waitingRoomService.removeFromWaitingQueue(roomId, userId);

      // Notify the waiting user they've been rejected
      this.server.to(userId).emit('rejected', {
        roomId,
        message: reason || 'You were not admitted to this room',
      });

      // Update waiting count
      await this.notifyWaitingRoomUpdate(roomId);

      this.logger.debug(`User ${userId} rejected from room ${roomId}`);
    } catch (error: unknown) {
      this.handleError(client, error, 'reject user');
    }
  }

  @SubscribeMessage('get-waiting-users')
  async handleGetWaitingUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const { roomId } = data;
      const waitingUsers = await this.waitingRoomService.getWaitingUsers(roomId);
      client.emit('waiting-users-list', { roomId, users: waitingUsers });
    } catch (error: unknown) {
      this.handleError(client, error, 'get waiting users');
    }
  }

  @SubscribeMessage('leave-waiting-room')
  async handleLeaveWaitingRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    try {
      const { roomId } = data;
      const userId = this.getUserId(client);

      const isWaiting = await this.waitingRoomService.isUserWaiting(roomId, userId);
      if (!isWaiting) {
        return; // User not in waiting queue, nothing to do
      }

      await this.waitingRoomService.removeFromWaitingQueue(roomId, userId);
      await this.notifyWaitingRoomUpdate(roomId);

      this.logger.debug(`User ${userId} left waiting queue of room ${roomId}`);
      client.emit('left-waiting-room', { roomId });
    } catch (error: unknown) {
      this.handleError(client, error, 'leave waiting room');
    }
  }

  // =============================================================================
  // UNIFIED EVENTS
  // =============================================================================

  /**
   * Handle participant state changes (mic, camera, screen share, etc.)
   * Broadcasts to all other participants in the room
   */
  @SubscribeMessage('participant:state')
  handleParticipantState(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      state: {
        audioEnabled?: boolean;
        videoEnabled?: boolean;
        isScreenSharing?: boolean;
        isSpeaking?: boolean;
        handRaised?: boolean;
        displayName?: string;
      };
    }
  ) {
    const { roomId, state } = data;
    const userId = this.getUserId(client);

    // Broadcast to all other participants in the room
    client.to(roomId).emit('participant:state-changed', {
      userId,
      state,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle room settings updates (host only)
   * Broadcasts to all participants in the room
   */
  @SubscribeMessage('room:settings')
  async handleRoomSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      settings: {
        permissions?: {
          allowMicrophone?: boolean;
          allowCamera?: boolean;
          allowScreenShare?: boolean;
          allowChat?: boolean;
        };
        lockRoom?: boolean;
        requirePassword?: boolean;
        password?: string;
        roomName?: string;
      };
    }
  ) {
    const { roomId, settings } = data;
    const userId = this.getUserId(client);

    try {
      // Verify user is host
      const room = await this.roomsService.getRoomInfo(roomId);
      if (!room || room.hostId !== userId) {
        client.emit('error', {
          code: 'NOT_HOST',
          message: 'Only the host can update room settings',
        });
        return;
      }

      // Update settings in service
      await this.roomSettingsService.updateSettings(roomId, {
        permissions: settings.permissions,
        lockRoom: settings.lockRoom,
        requirePassword: settings.requirePassword,
        password: settings.password,
        roomName: settings.roomName,
      });

      // Broadcast to all participants (excluding password)
      const broadcastSettings = { ...settings };
      delete broadcastSettings.password;

      this.server.to(roomId).emit('room:settings-changed', {
        settings: broadcastSettings,
        changedBy: userId,
        timestamp: Date.now(),
      });
    } catch (error: unknown) {
      this.handleError(client, error, 'update room settings');
    }
  }

  /**
   * Get current room settings
   */
  @SubscribeMessage('room:get-settings')
  async handleGetRoomSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    try {
      const { roomId } = data;
      const settings = await this.roomSettingsService.getSettings(roomId);
      const publicSettings = await this.roomSettingsService.getPublicSettings(roomId);

      client.emit('room:settings-sync', {
        settings: publicSettings || settings,
      });
    } catch (error: unknown) {
      this.handleError(client, error, 'get room settings');
    }
  }
}
