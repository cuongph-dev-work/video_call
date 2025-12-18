import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import type { WaitingUser } from '@video-call/types';

const WAITING_ROOM_TTL = 24 * 60 * 60; // 24 hours

@Injectable()
export class WaitingRoomService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  private waitingKey = (roomId: string) => `room:${roomId}:waiting`;
  private enabledKey = (roomId: string) => `room:${roomId}:waiting:enabled`;

  async isEnabled(roomId: string): Promise<boolean> {
    return (await this.redis.get(this.enabledKey(roomId))) === '1';
  }

  async setEnabled(roomId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      await this.redis.set(this.enabledKey(roomId), '1', 'EX', WAITING_ROOM_TTL);
    } else {
      await this.redis.del(this.enabledKey(roomId));
    }
  }

  async addToWaitingQueue(roomId: string, userId: string, displayName: string): Promise<void> {
    const user: WaitingUser = { id: userId, displayName, joinedAt: new Date() };
    await this.redis.hset(this.waitingKey(roomId), userId, JSON.stringify(user));
    await this.redis.expire(this.waitingKey(roomId), WAITING_ROOM_TTL);
  }

  async removeFromWaitingQueue(roomId: string, userId: string): Promise<void> {
    await this.redis.hdel(this.waitingKey(roomId), userId);
  }

  async getWaitingUsers(roomId: string): Promise<WaitingUser[]> {
    const data = await this.redis.hgetall(this.waitingKey(roomId));
    if (!data || Object.keys(data).length === 0) return [];
    return Object.values(data).map((json) => JSON.parse(json) as WaitingUser);
  }

  async getWaitingCount(roomId: string): Promise<number> {
    return this.redis.hlen(this.waitingKey(roomId));
  }

  async isUserWaiting(roomId: string, userId: string): Promise<boolean> {
    return (await this.redis.hexists(this.waitingKey(roomId), userId)) === 1;
  }

  async clearWaitingQueue(roomId: string): Promise<void> {
    await this.redis.del(this.waitingKey(roomId));
  }
}

