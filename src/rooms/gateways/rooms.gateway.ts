import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway()
export class RoomsGateway {
  @SubscribeMessage('join')
  join(client: Socket, room: string): string[] {
    client.join(room);
    return Array.from(client.rooms);
  }

  @SubscribeMessage('leave')
  leave(client: Socket, room: string): string[] {
    client.leave(room);
    return Array.from(client.rooms);
  }
}
