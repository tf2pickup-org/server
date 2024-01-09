import { Module } from '@nestjs/common';
import { RoomsGateway } from './gateways/rooms.gateway';

@Module({
  providers: [RoomsGateway],
})
export class RoomsModule {}
