import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import * as bcrypt from 'bcrypt';
import type { DetailedRoomSettings } from '@video-call/types';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { WaitingRoomService } from './waiting-room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomsService } from './rooms.service';

@Injectable()
export class RoomSettingsService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly waitingRoomService: WaitingRoomService,
    @Inject(forwardRef(() => RoomsService))
    private readonly roomsService: RoomsService,
  ) {}

  private getSettingsKey(roomId: string): string {
    return `room:${roomId}:settings`;
  }

  async isWaitingRoomEnabled(roomId: string): Promise<boolean> {
    return this.waitingRoomService.isEnabled(roomId);
  }

  /**
   * Create room with initial settings
   */
  async createRoom(
    roomId: string,
    createDto: CreateRoomDto,
  ): Promise<DetailedRoomSettings> {
    const defaultSettings = this.getDefaultSettings();

    const settings: DetailedRoomSettings = {
      ...defaultSettings,
      roomName: createDto.name,
      permissions: {
        ...defaultSettings.permissions,
        ...createDto.permissions,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store settings
    await this.redis.setex(
      this.getSettingsKey(roomId),
      24 * 60 * 60, // 24 hours
      JSON.stringify(settings),
    );

    // Create room entry with hostId and details
    await this.roomsService.createRoom(roomId, createDto.hostId, {
      name: createDto.name,
      scheduledTime: createDto.scheduledTime,
    });

    // Initial waiting room setup if needed
    if (createDto.permissions?.allowJoinBeforeHost === false) {
      await this.waitingRoomService.setEnabled(roomId, true);
    }

    return settings;
  }

  /**
   * Get room settings
   */
  async getSettings(roomId: string): Promise<DetailedRoomSettings | null> {
    const data = await this.redis.get(this.getSettingsKey(roomId));
    if (!data) {
      return this.getDefaultSettings();
    }
    return JSON.parse(data) as DetailedRoomSettings;
  }

  /**
   * Get default settings for new rooms
   */
  private getDefaultSettings(): DetailedRoomSettings {
    return {
      requirePassword: false,
      lockRoom: false,
      permissions: {
        allowChat: true,
        allowScreenShare: true,
        allowMicrophone: true,
        allowCamera: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Update room settings
   */
  async updateSettings(
    roomId: string,
    updates: UpdateSettingsDto,
  ): Promise<DetailedRoomSettings> {
    const currentSettings =
      (await this.getSettings(roomId)) || this.getDefaultSettings();

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (updates.password) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(updates.password, saltRounds);
    }

    const updatedSettings: DetailedRoomSettings = {
      ...currentSettings,
      ...updates,
      requirePassword:
        updates.requirePassword ?? currentSettings.requirePassword,
      lockRoom: updates.lockRoom ?? currentSettings.lockRoom,
      password: hashedPassword || currentSettings.password,
      permissions: {
        ...currentSettings.permissions,
        ...updates.permissions,
      },
      updatedAt: new Date(),
    };

    // Store in Redis with 24h TTL
    await this.redis.setex(
      this.getSettingsKey(roomId),
      24 * 60 * 60, // 24 hours
      JSON.stringify(updatedSettings),
    );

    return updatedSettings;
  }

  /**
   * Validate password for room
   */
  async validatePassword(roomId: string, password: string): Promise<boolean> {
    const settings = await this.getSettings(roomId);

    if (!settings?.requirePassword || !settings.password) {
      return true; // No password required
    }

    return bcrypt.compare(password, settings.password);
  }

  /**
   * Check if room is locked
   */
  async isRoomLocked(roomId: string): Promise<boolean> {
    const settings = await this.getSettings(roomId);
    return settings?.lockRoom || false;
  }

  /**
   * Check if room requires password
   */
  async requiresPassword(roomId: string): Promise<boolean> {
    const settings = await this.getSettings(roomId);
    return settings?.requirePassword || false;
  }

  /**
   * Delete room settings
   */
  async deleteSettings(roomId: string): Promise<void> {
    await this.redis.del(this.getSettingsKey(roomId));
  }

  /**
   * Get public settings (without password hash)
   */
  async getPublicSettings(
    roomId: string,
  ): Promise<Omit<DetailedRoomSettings, 'password'>> {
    const settings = await this.getSettings(roomId);
    if (!settings) {
      const defaultSettings = this.getDefaultSettings();
      const publicSettings = { ...defaultSettings };
      delete publicSettings.password;
      return publicSettings;
    }
    const publicSettings = { ...settings };
    delete publicSettings.password;
    return publicSettings;
  }
}
