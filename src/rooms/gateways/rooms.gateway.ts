import { ZodPipe } from '@/shared/pipes/zod.pipe';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { z } from 'zod';

const joinRoomSchema = z.string();
const leaveRoomSchema = z.string();

@WebSocketGateway()
export class RoomsGateway {
  @SubscribeMessage('join')
  join(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ZodPipe(joinRoomSchema))
    room: z.infer<typeof joinRoomSchema>,
  ): string[] {
    client.join(room);
    return Array.from(client.rooms);
  }

  @SubscribeMessage('leave')
  leave(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ZodPipe(leaveRoomSchema))
    room: z.infer<typeof leaveRoomSchema>,
  ): string[] {
    client.leave(room);
    return Array.from(client.rooms);
  }
}
