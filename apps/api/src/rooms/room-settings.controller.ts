import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RoomSettingsService } from './room-settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ValidatePasswordDto } from './dto/validate-password.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { generateMeetingCode } from '@video-call/utils';

@Controller('rooms')
export class RoomSettingsController {
  constructor(private readonly settingsService: RoomSettingsService) {}

  @Post()
  async createRoom(@Body() createDto: CreateRoomDto) {
    try {
      const roomId = generateMeetingCode().toLowerCase();
      const settings = await this.settingsService.createRoom(roomId, createDto);
      return { success: true, roomId, settings };
    } catch {
      throw new HttpException('Failed to create room', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':roomId/settings')
  async getSettings(@Param('roomId') roomId: string) {
    try {
      const settings = await this.settingsService.getPublicSettings(roomId);
      return { success: true, settings };
    } catch {
      throw new HttpException('Failed to fetch room settings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':roomId/settings')
  async updateSettings(@Param('roomId') roomId: string, @Body() updateDto: UpdateSettingsDto) {
    try {
      const settings = await this.settingsService.updateSettings(roomId, updateDto);
      const { password: _, ...publicSettings } = settings;
      return { success: true, settings: publicSettings, message: 'Room settings updated successfully' };
    } catch {
      throw new HttpException('Failed to update room settings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':roomId/validate-password')
  async validatePassword(@Param('roomId') roomId: string, @Body() validateDto: ValidatePasswordDto) {
    try {
      const isValid = await this.settingsService.validatePassword(roomId, validateDto.password);
      if (!isValid) {
        throw new HttpException('Invalid password', HttpStatus.UNAUTHORIZED);
      }
      return { success: true, message: 'Password validated successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to validate password', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':roomId/check-access')
  async checkAccess(@Param('roomId') roomId: string) {
    try {
      const [isLocked, requiresPassword, waitingRoomEnabled] = await Promise.all([
        this.settingsService.isRoomLocked(roomId),
        this.settingsService.requiresPassword(roomId),
        this.settingsService.isWaitingRoomEnabled(roomId),
      ]);
      return { success: true, isLocked, requiresPassword, waitingRoomEnabled };
    } catch {
      throw new HttpException('Failed to check room access', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':roomId/host')
  async getRoomHost(@Param('roomId') roomId: string) {
    try {
      const roomInfo = await this.settingsService['roomsService'].getRoomInfo(roomId);
      if (!roomInfo) {
        throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
      }
      return { success: true, hostId: roomInfo.hostId };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get room host', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

