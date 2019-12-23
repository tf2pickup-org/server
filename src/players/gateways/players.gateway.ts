import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Subject } from 'rxjs';

@WebSocketGateway()
export class PlayersGateway implements OnGatewayConnection, OnGatewayDisconnect {

  private _playerConnected = new Subject<Socket>();
  private _playerDisconnected = new Subject<Socket>();

  get playerConnected() {
    return this._playerConnected.asObservable();
  }

  get playerDisconnected() {
    return this._playerDisconnected.asObservable();
  }

  handleConnection(socket: Socket) {
    this._playerConnected.next(socket);
  }

  handleDisconnect(socket: Socket) {
    this._playerDisconnected.next(socket);
  }

}
