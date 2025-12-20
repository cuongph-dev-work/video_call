import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { RoomSettingsService } from './room-settings.service';
import { WaitingRoomService } from './waiting-room.service';
import { prisma } from '../lib/prisma';

// ============================================================================
// Types & Constants
// ============================================================================

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

const TTL = {
  ROOM: 24 * 60 * 60,        // 24 hours
  PARTICIPANT: 60 * 60,      // 1 hour
  USER_ROOMS: 60 * 60,       // 1 hour
} as const;

const ONE_HOUR_MS = 60 * 60 * 1000;

// ============================================================================
// Helper Functions
// ============================================================================

/** Convert object to Record<string, string> for Redis hset */
function toRedisHash(obj: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, String(v)])
  );
}

/** Parse participant data from Redis hash */
function parseParticipant(data: Record<string, string>): Participant {
  return {
    id: data.id,
    displayName: data.displayName,
    audioEnabled: data.audioEnabled === 'true',
    videoEnabled: data.videoEnabled === 'true',
    isHost: data.isHost === 'true',
    joinedAt: parseInt(data.joinedAt, 10),
  };
}

// ============================================================================
// Service
// ============================================================================

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

  // -------------------------------------------------------------------------
  // Redis Key Helpers
  // -------------------------------------------------------------------------

  private roomKey = (roomId: string) => `room:${roomId}`;
  private participantsKey = (roomId: string) => `room:${roomId}:participants`;
  private participantKey = (userId: string, roomId: string) => `participant:${userId}:${roomId}`;
  private userRoomsKey = (userId: string) => `user:${userId}:rooms`;

  // -------------------------------------------------------------------------
  // Room Lifecycle
  // -------------------------------------------------------------------------

  async createRoom(
    roomId: string,
    hostId: string,
    createDto?: { name?: string; scheduledTime?: string },
  ): Promise<void> {
    const now = Date.now();

    await this.redis.hset(this.roomKey(roomId), {
      id: roomId,
      hostId,
      createdAt: now.toString(),
      lastActivity: now.toString(),
    });

    await this.redis.expire(this.roomKey(roomId), TTL.ROOM);

    // Save to Postgres (upsert to handle re-creation)
    try {
      await prisma.room.upsert({
        where: { id: roomId },
        update: {
          hostId,
          name: createDto?.name,
          scheduledTime: createDto?.scheduledTime ? new Date(createDto.scheduledTime) : null,
        },
        create: {
          id: roomId,
          hostId,
          name: createDto?.name,
          scheduledTime: createDto?.scheduledTime ? new Date(createDto.scheduledTime) : null,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save room in DB: ${error instanceof Error ? error.message : error}`);
    }

    this.logger.log(`Room created: ${roomId}`);
  }

  async joinRoom(
    roomId: string,
    userId: string,
    options: {
      displayName: string;
      audioEnabled?: boolean;
      videoEnabled?: boolean;
    },
  ): Promise<Participant[]> {
    const { displayName, audioEnabled = true, videoEnabled = true } = options;
    // Cleanup stale room if needed
    if (await this.redis.exists(this.roomKey(roomId))) {
      if (await this.shouldCleanupRoom(roomId)) {
        this.logger.log(`Cleaning up stale room ${roomId}`);
        await this.cleanupRoom(roomId);
      }
    }

    // Create room if it doesn't exist
    if (!(await this.redis.exists(this.roomKey(roomId)))) {
      await this.createRoom(roomId, userId);
    }

    // Determine host status
    const roomInfo = await this.redis.hgetall(this.roomKey(roomId));
    const participantIds = await this.redis.smembers(this.participantsKey(roomId));
    const isHost = roomInfo.hostId ? roomInfo.hostId === userId : participantIds.length === 0;

    // Add participant
    await this.redis.sadd(this.participantsKey(roomId), userId);
    await this.redis.sadd(this.userRoomsKey(userId), roomId);
    await this.redis.expire(this.userRoomsKey(userId), TTL.USER_ROOMS);

    const participant: Participant = {
      id: userId,
      displayName,
      audioEnabled,
      videoEnabled,
      isHost,
      joinedAt: Date.now(),
    };

    await this.redis.hset(this.participantKey(userId, roomId), toRedisHash({ ...participant }));
    await this.redis.expire(this.participantKey(userId, roomId), TTL.PARTICIPANT);
    await this.redis.hset(this.roomKey(roomId), 'lastActivity', Date.now().toString());

    // Save user history (async)
    this.saveUserHistory(roomId, userId).catch(err => 
      this.logger.error(`Failed to save user history: ${err.message}`)
    );

    this.logger.log(`User ${displayName} joined room ${roomId}`);

    return this.getParticipants(roomId);
  }

  private async saveUserHistory(roomId: string, userId: string): Promise<void> {
    try {
      // Upsert to handle re-joins (only one record per user-room pair)
      await prisma.userRoomHistory.upsert({
        where: {
          userId_roomId: {
            userId,
            roomId,
          },
        },
        update: {
          joinedAt: new Date(), // Update join time on re-join
        },
        create: {
          userId,
          roomId,
          joinedAt: new Date(),
        },
      });
    } catch (error) {
      // Ignore if foreign key failure (room creates happen async/upsert)
      if (error instanceof Error && !error.message.includes('Foreign key constraint failed')) {
         this.logger.warn(`Failed to save user history: ${error.message}`);
      }
    }
  }


  async leaveRoom(roomId: string, userId: string): Promise<void> {
    // Remove participant
    await Promise.all([
      this.redis.srem(this.participantsKey(roomId), userId),
      this.redis.srem(this.userRoomsKey(userId), roomId),
      this.redis.del(this.participantKey(userId, roomId)),
    ]);

    // Update lastActivity timestamp
    await this.redis.hset(this.roomKey(roomId), {
      lastActivity: Date.now().toString(),
    });

    // Check if room is now empty
    const count = await this.redis.scard(this.participantsKey(roomId));
    if (count === 0) {
      // DON'T delete room immediately - preserve for host to rejoin
      // Only cleanup if room has been empty for > 1 hour
      if (await this.shouldCleanupRoom(roomId)) {
        const roomInfo = await this.redis.hgetall(this.roomKey(roomId));
        
        await Promise.all([
          this.redis.del(this.roomKey(roomId)),
          this.redis.del(this.participantsKey(roomId)),
        ]);

        // Clean up settings and waiting room
        await Promise.all([
          this.roomSettingsService.deleteSettings(roomId).catch(() => {}),
          this.waitingRoomService.clearWaitingQueue(roomId).catch(() => {}),
          this.waitingRoomService.setEnabled(roomId, false).catch(() => {}),
        ]);

        this.logger.log(`Room ${roomId} cleaned up (empty for > 1 hour)`);
      } else {
        this.logger.log(`Room ${roomId} is empty but preserved for host to rejoin`);
      }
    }

    this.logger.log(`User ${userId} left room ${roomId}`);
  }

  async handleDisconnect(userId: string): Promise<void> {
    const roomIds = await this.redis.smembers(this.userRoomsKey(userId));
    await Promise.all(roomIds.map((roomId) => this.leaveRoom(roomId, userId)));
    await this.redis.del(this.userRoomsKey(userId));
  }

  // -------------------------------------------------------------------------
  // Participants
  // -------------------------------------------------------------------------

  async getParticipants(roomId: string): Promise<Participant[]> {
    const participantIds = await this.redis.smembers(this.participantsKey(roomId));

    const results = await Promise.all(
      participantIds.map(async (userId) => {
        const data = await this.redis.hgetall(this.participantKey(userId, roomId));
        return data && Object.keys(data).length > 0 ? parseParticipant(data) : null;
      })
    );

    return results.filter((p): p is Participant => p !== null);
  }

  async updateParticipant(roomId: string, userId: string, updates: Partial<Participant>): Promise<void> {
    await this.redis.hset(this.participantKey(userId, roomId), toRedisHash(updates as Record<string, unknown>));
  }

  // -------------------------------------------------------------------------
  // Room Info
  // -------------------------------------------------------------------------

  async getRoomInfo(roomId: string): Promise<RoomInfo | null> {
    const data = await this.redis.hgetall(this.roomKey(roomId));

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    const participants = await this.getParticipants(roomId);

    return {
      id: data.id,
      hostId: data.hostId,
      participantCount: participants.length,
      createdAt: parseInt(data.createdAt, 10),
      lastActivity: parseInt(data.lastActivity, 10),
    };
  }

  // -------------------------------------------------------------------------
  // Cleanup Helper
  // -------------------------------------------------------------------------


  private async shouldCleanupRoom(roomId: string): Promise<boolean> {
    const participantCount = await this.redis.scard(this.participantsKey(roomId));
    if (participantCount > 0) return false;

    const roomData = await this.redis.hgetall(this.roomKey(roomId));
    if (!roomData?.lastActivity) return false;

    // Cleanup if room has been empty for more than 1 hour
    return Date.now() - parseInt(roomData.lastActivity, 10) > ONE_HOUR_MS;
  }

  private async cleanupRoom(roomId: string): Promise<void> {
    await Promise.all([
      this.redis.del(this.roomKey(roomId)),
      this.redis.del(this.participantsKey(roomId)),
      this.roomSettingsService.deleteSettings(roomId).catch((e) =>
        this.logger.warn(`Failed to cleanup settings: ${e}`)
      ),
      this.waitingRoomService.clearWaitingQueue(roomId).catch((e) =>
        this.logger.warn(`Failed to cleanup waiting room: ${e}`)
      ),
      this.waitingRoomService.setEnabled(roomId, false).catch(() => {}),
    ]);

    this.logger.log(`Room ${roomId} cleaned up`);
  }
}
