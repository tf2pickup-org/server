import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Socket } from 'socket.io';
import { PlayersGateway } from '../gateways/players.gateway';
import { Player } from '../models/player';
import { Subject } from 'rxjs';
import { ObjectId } from 'mongodb';

type SocketList = Socket[];

@Injectable()
export class OnlinePlayersService implements OnModuleInit {

  private readonly verifyPlayerTimeout = 10 * 1000; // 10 seconds
  private logger = new Logger(OnlinePlayersService.name);
  private sockets = new Map<ObjectId, SocketList>();
  private _playerLeft = new Subject<ObjectId>();

  get playerLeft() {
    return this._playerLeft.asObservable();
  }

  constructor(
    private playersGateway: PlayersGateway,
  ) { }

  onModuleInit() {
    this.playersGateway.playerConnected.subscribe(socket => {
      if (socket.request.user.logged_in) {
        const player = socket.request.user as Player;
        const playerId = new ObjectId(player.id);
        const sockets = this.sockets.get(playerId) || [];
        if (!sockets.includes(socket)) {
          this.logger.debug(`${player.name} connected`);
          this.sockets.set(playerId, [ ...sockets, socket ]);
        }
      }
    });

    this.playersGateway.playerDisconnected.subscribe(socket => {
      if (socket.request.user.logged_in) {
        const player = socket.request.user as Player;
        this.logger.debug(`${player.name} disconnected`);
        const playerId = new ObjectId(player.id);
        const sockets = this.getSocketsForPlayer(playerId);
        this.sockets.set(playerId, sockets.filter(s => s !== socket));
        setTimeout(() => this.verifyPlayer(playerId), this.verifyPlayerTimeout);
      }
    });
  }

  getSocketsForPlayer(playerId: ObjectId) {
    return this.sockets.get(playerId) || [];
  }

  private verifyPlayer(playerId: ObjectId) {
    const sockets = this.sockets.get(playerId);
    if (sockets.length === 0) {
      this._playerLeft.next(playerId);
    }
  }

}
