import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import * as bcrypt from 'bcrypt';
import type { DetailedRoomSettings } from '@video-call/types';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { WaitingRoomService } from './waiting-room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomsService } from './rooms.service';

const SETTINGS_TTL = 24 * 60 * 60; // 24 hours
const BCRYPT_ROUNDS = 10;

@Injectable()
export class RoomSettingsService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly waitingRoomService: WaitingRoomService,
    @Inject(forwardRef(() => RoomsService))
    private readonly roomsService: RoomsService,
  ) {}

  private getSettingsKey = (roomId: string) => `room:${roomId}:settings`;

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

  async isWaitingRoomEnabled(roomId: string): Promise<boolean> {
    return this.waitingRoomService.isEnabled(roomId);
  }

  async createRoom(roomId: string, createDto: CreateRoomDto): Promise<DetailedRoomSettings> {
    const defaultSettings = this.getDefaultSettings();

    const settings: DetailedRoomSettings = {
      ...defaultSettings,
      roomName: createDto.name,
      permissions: { ...defaultSettings.permissions, ...createDto.permissions },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.redis.setex(this.getSettingsKey(roomId), SETTINGS_TTL, JSON.stringify(settings));

    await this.roomsService.createRoom(roomId, createDto.hostId, {
      name: createDto.name,
      scheduledTime: createDto.scheduledTime,
    });

    if (createDto.permissions?.allowJoinBeforeHost === false) {
      await this.waitingRoomService.setEnabled(roomId, true);
    }

    return settings;
  }

  async getSettings(roomId: string): Promise<DetailedRoomSettings | null> {
    const data = await this.redis.get(this.getSettingsKey(roomId));
    return data ? (JSON.parse(data) as DetailedRoomSettings) : this.getDefaultSettings();
  }

  async updateSettings(roomId: string, updates: UpdateSettingsDto): Promise<DetailedRoomSettings> {
    const current = (await this.getSettings(roomId)) || this.getDefaultSettings();

    const hashedPassword = updates.password
      ? await bcrypt.hash(updates.password, BCRYPT_ROUNDS)
      : current.password;

    const updatedSettings: DetailedRoomSettings = {
      ...current,
      ...updates,
      requirePassword: updates.requirePassword ?? current.requirePassword,
      lockRoom: updates.lockRoom ?? current.lockRoom,
      password: hashedPassword,
      permissions: { ...current.permissions, ...updates.permissions },
      updatedAt: new Date(),
    };

    await this.redis.setex(this.getSettingsKey(roomId), SETTINGS_TTL, JSON.stringify(updatedSettings));

    return updatedSettings;
  }

  async validatePassword(roomId: string, password: string): Promise<boolean> {
    const settings = await this.getSettings(roomId);
    if (!settings?.requirePassword || !settings.password) return true;
    return bcrypt.compare(password, settings.password);
  }

  async isRoomLocked(roomId: string): Promise<boolean> {
    const settings = await this.getSettings(roomId);
    return settings?.lockRoom || false;
  }

  async requiresPassword(roomId: string): Promise<boolean> {
    const settings = await this.getSettings(roomId);
    return settings?.requirePassword || false;
  }

  async deleteSettings(roomId: string): Promise<void> {
    await this.redis.del(this.getSettingsKey(roomId));
  }

  async getPublicSettings(roomId: string): Promise<Omit<DetailedRoomSettings, 'password'>> {
    const settings = await this.getSettings(roomId);
    if (!settings) {
      const { password: _, ...publicSettings } = this.getDefaultSettings();
      return publicSettings;
    }
    const { password: _, ...publicSettings } = settings;
    return publicSettings;
  }
}

