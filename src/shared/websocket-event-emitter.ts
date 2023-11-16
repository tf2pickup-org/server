import { WebsocketEvent } from '@/websocket-event';
import { OnGatewayInit } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Serializable } from './serializable';
import { serialize } from './serialize';

interface EmitParams<T> {
  room?: string | string[];
  event: WebsocketEvent;
  payload: Serializable<T> | Serializable<T>[];
}

export class WebsocketEventEmitter<T> implements OnGatewayInit<Socket> {
  protected server!: Socket;

  afterInit(socket: Socket) {
    this.server = socket;
  }

  protected async emit({ room, event, payload }: EmitParams<T>) {
    const data = await serialize(payload);
    if (room) {
      this.server.to(room).emit(event, data);
    } else {
      this.server.emit(event, data);
    }
  }
}
