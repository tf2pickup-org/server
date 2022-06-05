import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Subject } from 'rxjs';
import { OnModuleInit } from '@nestjs/common';
import { Events } from '@/events/events';
import { WebsocketEvent } from '@/websocket-event';
import { PlayersService } from '../services/players.service';
import { WebsocketEventEmitter } from '@/shared/websocket-event-emitter';
import { PlayerDto } from '../dto/player.dto';

@WebSocketGateway()
export class PlayersGateway
  extends WebsocketEventEmitter<PlayerDto>
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private _playerConnected = new Subject<Socket>();
  private _playerDisconnected = new Subject<Socket>();

  get playerConnected() {
    return this._playerConnected.asObservable();
  }

  get playerDisconnected() {
    return this._playerDisconnected.asObservable();
  }

  constructor(private events: Events, private playersService: PlayersService) {
    super();
  }

  handleConnection(socket: Socket) {
    this._playerConnected.next(socket);
  }

  handleDisconnect(socket: Socket) {
    this._playerDisconnected.next(socket);
  }

  onModuleInit() {
    this.events.playerConnects.subscribe(async ({ playerId }) =>
      this.emit(
        WebsocketEvent.playerConnected,
        await this.playersService.getById(playerId),
      ),
    );
    this.events.playerDisconnects.subscribe(async ({ playerId }) =>
      this.emit(
        WebsocketEvent.playerDisconnected,
        await this.playersService.getById(playerId),
      ),
    );
  }
}
