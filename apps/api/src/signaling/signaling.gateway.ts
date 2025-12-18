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

    // Clean up user from any rooms they were in
    await this.roomsService.handleDisconnect(client.id);
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
    },
  ) {
    try {
      const { roomId, userId, displayName, password } = data;

      // Validate password if required
      const requiresPassword =
        await this.roomSettingsService.requiresPassword(roomId);
      if (requiresPassword) {
        if (!password) {
          throw new Error('PASSWORD_REQUIRED');
        }
        const isValid = await this.roomSettingsService.validatePassword(
          roomId,
          password,
        );
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
      const participants = await this.roomsService.joinRoom(
        roomId,
        userId, // Use provided userId (UUID) instead of client.id
        displayName,
      );

      // Join Socket.IO room
      void client.join(roomId);

      // Notify the user they've joined
      client.emit('room-joined', { roomId, participants });

      // Notify others in the room
      client.to(roomId).emit('user-joined', {
        participant: {
          id: userId, // Use persistent userId
          displayName,
          audioEnabled: true,
          videoEnabled: true,
          isHost: participants.find((p) => p.id === userId)?.isHost || false,
        },
      });

      this.logger.log(`${displayName} joined room ${roomId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      client.emit('error', {
        code: message,
        message: 'Failed to join room',
      });
    }
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { roomId } = data;

    await this.roomsService.leaveRoom(roomId, client.id);
    void client.leave(roomId);

    // Notify others
    client.to(roomId).emit('user-left', { userId: client.id });

    this.logger.log(`User ${client.id} left room ${roomId}`);
  }

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; offer: RTCSessionDescriptionInit },
  ) {
    this.logger.log(`Forwarding offer from ${client.id} to ${data.to}`);
    this.server.to(data.to).emit('offer', {
      from: client.id,
      offer: data.offer,
    });
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; answer: RTCSessionDescriptionInit },
  ) {
    this.logger.log(`Forwarding answer from ${client.id} to ${data.to}`);
    this.server.to(data.to).emit('answer', {
      from: client.id,
      answer: data.answer,
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; candidate: RTCIceCandidateInit },
  ) {
    this.server.to(data.to).emit('ice-candidate', {
      from: client.id,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('toggle-audio')
  handleToggleAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; enabled: boolean },
  ) {
    const { roomId, enabled } = data;
    client.to(roomId).emit('participant-audio-changed', {
      userId: client.id,
      enabled,
    });
  }

  @SubscribeMessage('toggle-video')
  handleToggleVideo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; enabled: boolean },
  ) {
    const { roomId, enabled } = data;
    client.to(roomId).emit('participant-video-changed', {
      userId: client.id,
      enabled,
    });
  }

  @SubscribeMessage('screen-share-start')
  handleScreenShareStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; displayName: string },
  ) {
    const { roomId, displayName } = data;
    client.to(roomId).emit('screen-share-started', {
      userId: client.id,
      displayName,
    });
  }

  @SubscribeMessage('screen-share-stop')
  handleScreenShareStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { roomId } = data;
    client.to(roomId).emit('screen-share-stopped', {
      userId: client.id,
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
    // Get participant info from room
    const participants = await this.roomsService.getParticipants(data.roomId);
    const sender = participants.find((p) => p.id === client.id);

    const message = {
      id: Date.now().toString(),
      senderId: client.id,
      senderName: sender?.displayName || 'User',
      content: data.content,
      timestamp: new Date(),
      isPrivate: data.isPrivate,
      recipientId: data.recipientId,
    };

    if (data.isPrivate && data.recipientId) {
      // Send to specific user
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
    @MessageBody() data: { roomId: string; displayName: string },
  ) {
    try {
      const { roomId, displayName } = data;

      // Join socket room first so waiting user can receive admitted/rejected events
      void client.join(roomId);

      // Add to waiting queue
      await this.waitingRoomService.addToWaitingQueue(
        roomId,
        client.id,
        displayName,
      );

      // Notify user they're waiting
      client.emit('waiting-room-joined', {
        roomId,
        message: 'Waiting for host to admit you',
      });

      // Notify host/participants in room about new waiting user
      const waitingUser = {
        id: client.id,
        displayName,
        joinedAt: new Date(),
      };

      const waitingCount =
        await this.waitingRoomService.getWaitingCount(roomId);

      // Emit to all in room (including the waiting user who just joined)
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
}
