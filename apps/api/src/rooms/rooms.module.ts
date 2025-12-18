import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RoomsService } from './rooms.service';
import { RoomSettingsService } from './room-settings.service';
import { RoomSettingsController } from './room-settings.controller';
import { WaitingRoomService } from './waiting-room.service';

@Module({
  imports: [RedisModule],
  controllers: [RoomSettingsController],
  providers: [RoomsService, RoomSettingsService, WaitingRoomService],
  exports: [RoomsService, RoomSettingsService, WaitingRoomService],
})
export class RoomsModule {}
