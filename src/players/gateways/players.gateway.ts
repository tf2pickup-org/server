import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Subject } from 'rxjs';
import { OnModuleInit } from '@nestjs/common';
import { Events } from '@/events/events';
import { WebsocketEvent } from '@/websocket-event';
import { PlayersService } from '../services/players.service';
import { serialize } from '@/shared/serialize';

@WebSocketGateway()
export class PlayersGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    OnModuleInit
{
  private _playerConnected = new Subject<Socket>();
  private _playerDisconnected = new Subject<Socket>();
  private socket: Socket;

  get playerConnected() {
    return this._playerConnected.asObservable();
  }

  get playerDisconnected() {
    return this._playerDisconnected.asObservable();
  }

  constructor(private events: Events, private playersService: PlayersService) {}

  handleConnection(socket: Socket) {
    this._playerConnected.next(socket);
  }

  handleDisconnect(socket: Socket) {
    this._playerDisconnected.next(socket);
  }

  afterInit(socket: Socket) {
    this.socket = socket;
  }

  onModuleInit() {
    this.events.playerConnects.subscribe(async ({ playerId }) =>
      this.socket.emit(
        WebsocketEvent.playerConnected,
        serialize(await this.playersService.getById(playerId)),
      ),
    );
    this.events.playerDisconnects.subscribe(async ({ playerId }) =>
      this.socket.emit(
        WebsocketEvent.playerDisconnected,
        serialize(await this.playersService.getById(playerId)),
      ),
    );
  }
}
