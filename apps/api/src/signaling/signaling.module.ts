import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { RoomsModule } from '../rooms/rooms.module';
import { WaitingRoomService } from '../rooms/waiting-room.service';

@Module({
  imports: [RoomsModule],
  providers: [SignalingGateway, WaitingRoomService],
})
export class SignalingModule {}
