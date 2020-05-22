import { WebSocketGateway, OnGatewayInit } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { TwitchStream } from '../models/twitch-stream';

@WebSocketGateway()
export class TwitchGateway implements OnGatewayInit {

  private socket: Socket;

  emitStreamsUpdate(streams: TwitchStream[]) {
    this.socket?.emit('twitch streams update', streams)
  }

  afterInit(socket: Socket) {
    this.socket = socket;
  }

}
