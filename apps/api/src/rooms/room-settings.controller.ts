import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RoomSettingsService } from './room-settings.service';
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

  /**
   * Unified endpoint for room information
   * Returns: settings, isHost, participantCount, lastActivity
   * Only returns 404 if room doesn't exist or has expired
   */
  @Get(':roomId/info')
  async getRoomInfo(
    @Param('roomId') roomId: string,
    @Query('userId') userId?: string,
  ) {
    try {
      // Get room info from Redis
      const roomInfo = await this.settingsService['roomsService'].getRoomInfo(roomId);
      
      // Only return 404 if room doesn't exist (not created or expired)
      if (!roomInfo) {
        throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
      }

      // Get public settings (without password)
      const settings = await this.settingsService.getPublicSettings(roomId);

      // Determine if user is host
      const isHost = userId ? roomInfo.hostId === userId : false;

      return {
        success: true,
        roomId,
        hostId: roomInfo.hostId,
        isHost,
        participantCount: roomInfo.participantCount,
        lastActivity: roomInfo.lastActivity,
        settings,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get room info', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * @deprecated Use getRoomInfo instead - kept for backward compatibility
   */
  @Get(':roomId/settings')
  async getSettings(@Param('roomId') roomId: string) {
    try {
      const settings = await this.settingsService.getPublicSettings(roomId);
      return { success: true, settings };
    } catch {
      throw new HttpException('Failed to fetch room settings', HttpStatus.INTERNAL_SERVER_ERROR);
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
}
