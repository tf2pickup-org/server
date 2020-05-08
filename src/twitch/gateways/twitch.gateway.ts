import { WebSocketGateway, OnGatewayInit } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { TwitchStream } from '../models/twitch-stream';

@WebSocketGateway({ namespace: 'twitch' })
export class TwitchGateway implements OnGatewayInit {

  private socket: Socket;

  emitStreamsUpdate(streams: TwitchStream[]) {
    this.socket?.emit('streams update', streams)
  }

  afterInit(socket: Socket) {
    this.socket = socket;
  }

}
