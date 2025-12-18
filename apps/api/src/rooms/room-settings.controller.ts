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

  /**
   * POST /rooms
   * Create a new room with settings
   */
  @Post()
  async createRoom(@Body() createDto: CreateRoomDto) {
    try {
      // Generate a Google Meet style ID (e.g. "XX-XXXX-XX")
      const roomId = generateMeetingCode().toLowerCase();

      const settings = await this.settingsService.createRoom(roomId, createDto);

      return {
        success: true,
        roomId,
        settings,
      };
    } catch {
      throw new HttpException(
        'Failed to create room',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /rooms/:roomId/settings
   * Get public room settings (without password hash)
   */
  @Get(':roomId/settings')
  async getSettings(@Param('roomId') roomId: string) {
    try {
      const settings = await this.settingsService.getPublicSettings(roomId);
      return {
        success: true,
        settings,
      };
    } catch {
      throw new HttpException(
        'Failed to fetch room settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /rooms/:roomId/settings
   * Update room settings
   */
  @Put(':roomId/settings')
  async updateSettings(
    @Param('roomId') roomId: string,
    @Body() updateDto: UpdateSettingsDto,
  ) {
    try {
      const settings = await this.settingsService.updateSettings(
        roomId,
        updateDto,
      );

      // Return without password hash
      const publicSettings = { ...settings };
      delete publicSettings.password;

      return {
        success: true,
        settings: publicSettings,
        message: 'Room settings updated successfully',
      };
    } catch {
      throw new HttpException(
        'Failed to update room settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /rooms/:roomId/validate-password
   * Validate room password
   */
  @Post(':roomId/validate-password')
  async validatePassword(
    @Param('roomId') roomId: string,
    @Body() validateDto: ValidatePasswordDto,
  ) {
    try {
      const isValid = await this.settingsService.validatePassword(
        roomId,
        validateDto.password,
      );

      if (!isValid) {
        throw new HttpException('Invalid password', HttpStatus.UNAUTHORIZED);
      }

      return {
        success: true,
        message: 'Password validated successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to validate password',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /rooms/:roomId/check-access
   * Check if room is accessible (not locked, password status)
   */
  @Get(':roomId/check-access')
  async checkAccess(@Param('roomId') roomId: string) {
    try {
      const isLocked = await this.settingsService.isRoomLocked(roomId);
      const requiresPassword =
        await this.settingsService.requiresPassword(roomId);
      const waitingRoomEnabled =
        await this.settingsService.isWaitingRoomEnabled(roomId);

      return {
        success: true,
        isLocked,
        requiresPassword,
        waitingRoomEnabled,
      };
    } catch {
      throw new HttpException(
        'Failed to check room access',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /rooms/:roomId/host
   * Check if room exists and get host ID
   */
  @Get(':roomId/host')
  async getRoomHost(@Param('roomId') roomId: string) {
    try {
      const roomInfo = await this.settingsService['roomsService'].getRoomInfo(roomId);
      
      if (!roomInfo) {
        throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        hostId: roomInfo.hostId,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get room host',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
