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
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const userId = this.socketIdToUserId.get(client.id);
    if (userId) {
      // Clean up user from any rooms they were in
      await this.roomsService.handleDisconnect(userId);
      this.socketIdToUserId.delete(client.id);

      // Check if user was in any waiting queue and remove them
      // Note: We need to check all rooms because we don't track which room they were waiting for
      // In production, you might want to track this mapping
      try {
        // Get all room keys from Redis to check waiting queues
        const allRooms = await this.redis.keys('room:*:waiting');
        
        for (const key of allRooms) {
          // Extract roomId from key format: room:{roomId}:waiting
          const roomId = key.split(':')[1];
          
          const isWaiting = await this.waitingRoomService.isUserWaiting(roomId, userId);
          if (isWaiting) {
            // Remove from waiting queue
            await this.waitingRoomService.removeFromWaitingQueue(roomId, userId);
            
            // Update waiting count for host
            const waitingCount = await this.waitingRoomService.getWaitingCount(roomId);
            this.server.to(roomId).emit('waiting-count-updated', {
              waitingCount,
            });
            
            // Emit updated waiting users list to host
            const waitingUsers = await this.waitingRoomService.getWaitingUsers(roomId);
            this.server.to(roomId).emit('waiting-users-list', {
              roomId,
              users: waitingUsers,
            });
            
            this.logger.log(`Removed disconnected user ${userId} from waiting queue of room ${roomId}`);
          }
        }
      } catch (error) {
        this.logger.error(`Error cleaning up waiting user ${userId}:`, error);
      }

      // We don't have roomId here, so we can't emit user-left easily to a specific room
      // However, handleDisconnect in roomsService should handle the cleanup.
      // We might need to track which room the user was in if we want to emit user-left.
    } else {
      // Fallback to client.id for legacy or if userId not found
      await this.roomsService.handleDisconnect(client.id);
    }
  }

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
    },
  ) {
    try {
      const { roomId, userId, displayName, password, audioEnabled = true, videoEnabled = true } = data;

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
      const participants = await this.roomsService.joinRoom(roomId, userId, displayName);

      // Store socket ID to user ID mapping
      this.socketIdToUserId.set(client.id, userId);

      // Join Socket.IO room for this meeting
      void client.join(roomId);
      // Join individual room for this user (to receive private messages)
      void client.join(userId);

      // Notify the user they've joined
      client.emit('room-joined', { roomId, participants });

      // Notify others in the room with actual device status
      client.to(roomId).emit('user-joined', {
        participant: {
          id: userId,
          displayName,
          audioEnabled,
          videoEnabled,
          isHost: participants.find((p) => p.id === userId)?.isHost || false,
        },
      });

      this.logger.log(`${displayName} joined room ${roomId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      client.emit('error', { code: message, message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { roomId } = data;
    const userId = this.socketIdToUserId.get(client.id) || client.id;

    await this.roomsService.leaveRoom(roomId, userId);
    void client.leave(roomId);

    // Notify others
    client.to(roomId).emit('user-left', { userId });

    this.logger.log(`User ${userId} left room ${roomId}`);
  }

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; offer: RTCSessionDescriptionInit },
  ) {
    const fromUserId = this.socketIdToUserId.get(client.id) || client.id;
    this.logger.log(`Forwarding offer from ${fromUserId} to ${data.to}`);
    this.server.to(data.to).emit('offer', {
      from: fromUserId,
      offer: data.offer,
    });
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; answer: RTCSessionDescriptionInit },
  ) {
    const fromUserId = this.socketIdToUserId.get(client.id) || client.id;
    this.logger.log(`Forwarding answer from ${fromUserId} to ${data.to}`);
    this.server.to(data.to).emit('answer', {
      from: fromUserId,
      answer: data.answer,
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; candidate: RTCIceCandidateInit },
  ) {
    const fromUserId = this.socketIdToUserId.get(client.id) || client.id;
    this.server.to(data.to).emit('ice-candidate', {
      from: fromUserId,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('toggle-audio')
  handleToggleAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; enabled: boolean },
  ) {
    const { roomId, enabled } = data;
    const userId = this.socketIdToUserId.get(client.id) || client.id;
    client.to(roomId).emit('participant-audio-changed', {
      userId,
      enabled,
    });
  }

  @SubscribeMessage('toggle-video')
  handleToggleVideo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; enabled: boolean },
  ) {
    const { roomId, enabled } = data;
    const userId = this.socketIdToUserId.get(client.id) || client.id;
    client.to(roomId).emit('participant-video-changed', {
      userId,
      enabled,
    });
  }

  @SubscribeMessage('screen-share-start')
  handleScreenShareStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; displayName: string },
  ) {
    const { roomId, displayName } = data;
    const userId = this.socketIdToUserId.get(client.id) || client.id;
    client.to(roomId).emit('screen-share-started', {
      userId,
      displayName,
    });
  }

  @SubscribeMessage('screen-share-stop')
  handleScreenShareStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { roomId } = data;
    const userId = this.socketIdToUserId.get(client.id) || client.id;
    client.to(roomId).emit('screen-share-stopped', {
      userId,
    });
  }

  @SubscribeMessage('chat-message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      content: string;
      isPrivate: boolean;
      recipientId?: string;
    },
  ) {
    const userId = this.socketIdToUserId.get(client.id) || client.id;
    // Get participant info from room
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

      this.logger.log(`${displayName} joined waiting room for ${roomId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      client.emit('error', {
        code: message,
        message: 'Failed to join waiting room',
      });
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

      // Update waiting count for host
      const waitingCount =
        await this.waitingRoomService.getWaitingCount(roomId);
      this.server.to(roomId).emit('waiting-count-updated', {
        waitingCount,
      });

      this.logger.log(`User ${userId} admitted to room ${roomId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      client.emit('error', {
        code: message,
        message: 'Failed to admit user',
      });
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

      // Update waiting count for host
      const waitingCount =
        await this.waitingRoomService.getWaitingCount(roomId);
      this.server.to(roomId).emit('waiting-count-updated', {
        waitingCount,
      });

      this.logger.log(`User ${userId} rejected from room ${roomId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      client.emit('error', {
        code: message,
        message: 'Failed to reject user',
      });
    }
  }

  @SubscribeMessage('get-waiting-users')
  async handleGetWaitingUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const { roomId } = data;
      const waitingUsers =
        await this.waitingRoomService.getWaitingUsers(roomId);

      client.emit('waiting-users-list', {
        roomId,
        users: waitingUsers,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      client.emit('error', {
        code: message,
        message: 'Failed to get waiting users',
      });
    }
  }

  // =============================================================================
  // Unified Events (New Extensible Design)
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
    },
  ) {
    const { roomId, state } = data;
    const userId = this.socketIdToUserId.get(client.id) || client.id;

    this.logger.debug(`Participant ${userId} state change in room ${roomId}:`, state);

    // Broadcast to all other participants in the room
    client.to(roomId).emit('participant:state-changed', {
      userId,
      state,
      timestamp: Date.now(),
    });

    // Also emit legacy events for backward compatibility
    if (state.audioEnabled !== undefined) {
      client.to(roomId).emit('participant-audio-changed', {
        userId,
        enabled: state.audioEnabled,
      });
    }
    if (state.videoEnabled !== undefined) {
      client.to(roomId).emit('participant-video-changed', {
        userId,
        enabled: state.videoEnabled,
      });
    }
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
    },
  ) {
    const { roomId, settings } = data;
    const userId = this.socketIdToUserId.get(client.id) || client.id;

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

      this.logger.log(`Room ${roomId} settings updated by host ${userId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      client.emit('error', {
        code: message,
        message: 'Failed to update room settings',
      });
    }
  }

  /**
   * Get current room settings
   */
  @SubscribeMessage('room:get-settings')
  async handleGetRoomSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const { roomId } = data;
      const settings = await this.roomSettingsService.getSettings(roomId);
      
      // Get public settings (without password)
      const publicSettings = await this.roomSettingsService.getPublicSettings(roomId);

      client.emit('room:settings-sync', {
        settings: publicSettings || settings,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      client.emit('error', {
        code: message,
        message: 'Failed to get room settings',
      });
    }
  }
}

