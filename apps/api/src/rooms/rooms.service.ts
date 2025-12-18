import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { RoomSettingsService } from './room-settings.service';
import { WaitingRoomService } from './waiting-room.service';
import { prisma } from '../lib/prisma';

interface Participant {
  id: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isHost: boolean;
  joinedAt: number;
}

interface RoomInfo {
  id: string;
  hostId: string;
  participantCount: number;
  createdAt: number;
  lastActivity: number;
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Inject(forwardRef(() => RoomSettingsService))
    private readonly roomSettingsService: RoomSettingsService,
    @Inject(forwardRef(() => WaitingRoomService))
    private readonly waitingRoomService: WaitingRoomService,
  ) {}

  async createRoom(
    roomId: string,
    hostId: string,
    createDto?: { name?: string; scheduledTime?: string },
  ): Promise<void> {
    const roomKey = `room:${roomId}`;

    await this.redis.hset(roomKey, {
      id: roomId,
      hostId,
      createdAt: Date.now().toString(),
      lastActivity: Date.now().toString(),
    });

    // Set TTL of 24 hours
    await this.redis.expire(roomKey, 24 * 60 * 60);

    // Save to Postgres
    try {
      await prisma.room.create({
        data: {
          id: roomId,
          hostId,
          name: createDto?.name,
          scheduledTime: createDto?.scheduledTime
            ? new Date(createDto.scheduledTime)
            : null,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to create room in DB: ${error.message}`);
      } else {
        this.logger.error(`Failed to create room in DB: ${String(error)}`);
      }
      // Non-blocking, we optimize for real-time availability
    }

    this.logger.log(`Room created: ${roomId}`);
  }

  async joinRoom(
    roomId: string,
    userId: string,
    displayName: string,
  ): Promise<Participant[]> {
    const roomKey = `room:${roomId}`;
    const participantsKey = `room:${roomId}:participants`;
    const participantKey = `participant:${userId}:${roomId}`;
    const userRoomsKey = `user:${userId}:rooms`;

    // Check if room exists
    const roomExists = await this.redis.exists(roomKey);

    if (roomExists) {
      // Check if room should be cleaned up (created > 1h ago and no participants)
      const shouldCleanup = await this.shouldCleanupRoom(roomId);
      if (shouldCleanup) {
        this.logger.log(`Cleaning up stale room ${roomId} (empty for > 1h)`);
        await this.cleanupRoom(roomId);
        // Room will be recreated below
      }
    }

    // Check if room exists after potential cleanup, if not create it
    const roomStillExists = await this.redis.exists(roomKey);
    if (!roomStillExists) {
      // Create new room (either first time or after cleanup)
      await this.createRoom(roomId, userId);
    }

    // Get room info to check host
    const roomInfo = await this.redis.hgetall(roomKey);
    const hostId = roomInfo.hostId;

    // Check if user is host (compare IDs)
    // Fallback: if no hostId (legacy rooms), first user is host
    const participantIds = await this.redis.smembers(participantsKey);
    const isHost = hostId ? hostId === userId : participantIds.length === 0;

    // Add participant to room
    await this.redis.sadd(participantsKey, userId);

    // Track user's rooms for efficient disconnect handling
    await this.redis.sadd(userRoomsKey, roomId);
    await this.redis.expire(userRoomsKey, 60 * 60); // 1 hour

    // Store participant data
    const participant: Participant = {
      id: userId,
      displayName,
      audioEnabled: true,
      videoEnabled: true,
      isHost,
      joinedAt: Date.now(),
    };

    await this.redis.hset(
      participantKey,
      Object.entries(participant).reduce(
        (acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        },
        {} as Record<string, string>,
      ),
    );

    // Set TTL
    await this.redis.expire(participantKey, 60 * 60); // 1 hour

    // Update room activity
    await this.redis.hset(roomKey, 'lastActivity', Date.now().toString());

    // Get all participants
    const participants = await this.getParticipants(roomId);

    this.logger.log(`User ${displayName} joined room ${roomId}`);

    return participants;
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const participantsKey = `room:${roomId}:participants`;
    const participantKey = `participant:${userId}:${roomId}`;
    const userRoomsKey = `user:${userId}:rooms`;

    // Remove from participants set
    await this.redis.srem(participantsKey, userId);

    // Remove from user's rooms tracking
    await this.redis.srem(userRoomsKey, roomId);

    // Delete participant data
    await this.redis.del(participantKey);

    // Check if room is empty
    const count = await this.redis.scard(participantsKey);
    if (count === 0) {
      // Get room info for history before deleting
      const roomInfo = await this.redis.hgetall(`room:${roomId}`);

      // Delete room if empty
      await this.redis.del(`room:${roomId}`);
      await this.redis.del(participantsKey);

      // Save history to DB
      if (roomInfo && roomInfo.createdAt) {
        try {
          const startedAt = new Date(parseInt(roomInfo.createdAt));
          const endedAt = new Date();

          await prisma.meetingHistory.create({
            data: {
              roomId,
              startedAt,
              endedAt,
              // We could track peak participants or total unique participants if we stored that
              // For now, we don't have that exact count readily available in the simple Redis structure
              // unless we tracked it separately.
            },
          });
        } catch (error) {
          if (error instanceof Error) {
            this.logger.error(
              `Failed to save meeting history: ${error.message}`,
            );
          } else {
            this.logger.error(
              `Failed to save meeting history: ${String(error)}`,
            );
          }
        }
      }

      this.logger.log(`Room ${roomId} deleted (empty)`);
    }

    this.logger.log(`User ${userId} left room ${roomId}`);
  }

  async getParticipants(roomId: string): Promise<Participant[]> {
    const participantsKey = `room:${roomId}:participants`;
    const participantIds = await this.redis.smembers(participantsKey);

    const participants: Participant[] = [];

    for (const userId of participantIds) {
      const participantKey = `participant:${userId}:${roomId}`;
      const data = await this.redis.hgetall(participantKey);

      if (data && Object.keys(data).length > 0) {
        participants.push({
          id: data.id,
          displayName: data.displayName,
          audioEnabled: data.audioEnabled === 'true',
          videoEnabled: data.videoEnabled === 'true',
          isHost: data.isHost === 'true',
          joinedAt: parseInt(data.joinedAt),
        });
      }
    }

    return participants;
  }

  async updateParticipant(
    roomId: string,
    userId: string,
    updates: Partial<Participant>,
  ): Promise<void> {
    const participantKey = `participant:${userId}:${roomId}`;

    const updateData = Object.entries(updates).reduce(
      (acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      },
      {} as Record<string, string>,
    );

    await this.redis.hset(participantKey, updateData);
  }

  async handleDisconnect(userId: string): Promise<void> {
    // Use efficient set lookup instead of keys() scan
    const userRoomsKey = `user:${userId}:rooms`;
    const roomIds = await this.redis.smembers(userRoomsKey);

    // Leave all rooms user was in
    await Promise.all(roomIds.map((roomId) => this.leaveRoom(roomId, userId)));

    // Clean up user's rooms tracking
    await this.redis.del(userRoomsKey);
  }

  async getRoomInfo(roomId: string): Promise<RoomInfo | null> {
    const roomKey = `room:${roomId}`;
    const data = await this.redis.hgetall(roomKey);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    const participants = await this.getParticipants(roomId);

    return {
      id: data.id,
      hostId: data.hostId,
      participantCount: participants.length,
      createdAt: parseInt(data.createdAt),
      lastActivity: parseInt(data.lastActivity),
    };
  }

  /**
   * Check if room should be cleaned up (created > 1h ago and no participants)
   */
  private async shouldCleanupRoom(roomId: string): Promise<boolean> {
    const roomKey = `room:${roomId}`;
    const participantsKey = `room:${roomId}:participants`;

    // Check if room has participants
    const participantCount = await this.redis.scard(participantsKey);
    if (participantCount > 0) {
      return false; // Room has participants, don't cleanup
    }

    // Check room age
    const roomData = await this.redis.hgetall(roomKey);
    if (!roomData || !roomData.createdAt) {
      return false; // No creation time, skip cleanup
    }

    const createdAt = parseInt(roomData.createdAt);
    const now = Date.now();
    const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds

    // Room is older than 1 hour and has no participants
    return now - createdAt > oneHourInMs;
  }

  /**
   * Cleanup room completely (Redis data, settings, waiting room)
   */
  private async cleanupRoom(roomId: string): Promise<void> {
    const roomKey = `room:${roomId}`;
    const participantsKey = `room:${roomId}:participants`;

    // Get room info for history before deleting
    const roomInfo = await this.redis.hgetall(roomKey);

    // Delete room and participants
    await this.redis.del(roomKey);
    await this.redis.del(participantsKey);

    // Cleanup settings
    try {
      await this.roomSettingsService.deleteSettings(roomId);
    } catch (error) {
      this.logger.warn(
        `Failed to cleanup settings for room ${roomId}: ${error}`,
      );
    }

    // Cleanup waiting room
    try {
      await this.waitingRoomService.clearWaitingQueue(roomId);
      await this.waitingRoomService.setEnabled(roomId, false);
    } catch (error) {
      this.logger.warn(
        `Failed to cleanup waiting room for ${roomId}: ${error}`,
      );
    }

    // Save history to DB if room was created
    if (roomInfo && roomInfo.createdAt) {
      try {
        const startedAt = new Date(parseInt(roomInfo.createdAt));
        const endedAt = new Date();

        await prisma.meetingHistory.create({
          data: {
            roomId,
            startedAt,
            endedAt,
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(`Failed to save meeting history: ${error.message}`);
        } else {
          this.logger.error(`Failed to save meeting history: ${String(error)}`);
        }
      }
    }

    this.logger.log(`Room ${roomId} cleaned up (stale empty room)`);
  }
}
