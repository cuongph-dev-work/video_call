import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import type { WaitingUser } from '@video-call/types';

@Injectable()
export class WaitingRoomService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  private getWaitingKey(roomId: string): string {
    return `room:${roomId}:waiting`;
  }

  private getEnabledKey(roomId: string): string {
    return `room:${roomId}:waiting:enabled`;
  }

  /**
   * Check if waiting room is enabled for a room
   */
  async isEnabled(roomId: string): Promise<boolean> {
    const enabled = await this.redis.get(this.getEnabledKey(roomId));
    return enabled === '1';
  }

  /**
   * Enable/disable waiting room
   */
  async setEnabled(roomId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      await this.redis.set(this.getEnabledKey(roomId), '1', 'EX', 24 * 60 * 60);
    } else {
      await this.redis.del(this.getEnabledKey(roomId));
    }
  }

  /**
   * Add user to waiting queue
   */
  async addToWaitingQueue(
    roomId: string,
    userId: string,
    displayName: string,
  ): Promise<void> {
    const user: WaitingUser = {
      id: userId,
      displayName,
      joinedAt: new Date(),
    };

    await this.redis.hset(
      this.getWaitingKey(roomId),
      userId,
      JSON.stringify(user),
    );

    // Set TTL for waiting queue
    await this.redis.expire(this.getWaitingKey(roomId), 24 * 60 * 60);
  }

  /**
   * Remove user from waiting queue
   */
  async removeFromWaitingQueue(roomId: string, userId: string): Promise<void> {
    await this.redis.hdel(this.getWaitingKey(roomId), userId);
  }

  /**
   * Get all waiting users for a room
   */
  async getWaitingUsers(roomId: string): Promise<WaitingUser[]> {
    const data = await this.redis.hgetall(this.getWaitingKey(roomId));

    if (!data || Object.keys(data).length === 0) {
      return [];
    }

    return Object.values(data).map(
      (userJson) => JSON.parse(userJson) as WaitingUser,
    );
  }

  /**
   * Get count of waiting users
   */
  async getWaitingCount(roomId: string): Promise<number> {
    return await this.redis.hlen(this.getWaitingKey(roomId));
  }

  /**
   * Check if user is in waiting queue
   */
  async isUserWaiting(roomId: string, userId: string): Promise<boolean> {
    const exists = await this.redis.hexists(this.getWaitingKey(roomId), userId);
    return exists === 1;
  }

  /**
   * Clear all waiting users (when room ends)
   */
  async clearWaitingQueue(roomId: string): Promise<void> {
    await this.redis.del(this.getWaitingKey(roomId));
  }
}
