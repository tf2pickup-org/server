import { WebsocketEvent } from '@/websocket-event';
import { OnGatewayInit } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Serializable } from './serializable';
import { serialize } from './serialize';

export class WebsocketEventEmitter<T> implements OnGatewayInit<Socket> {
  protected server: Socket;

  afterInit(socket: Socket) {
    this.server = socket;
  }

  protected async emit(event: WebsocketEvent, payload: Serializable<T>) {
    this.server.emit(event, await serialize(payload));
  }
}
