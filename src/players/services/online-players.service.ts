import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Socket } from 'socket.io';
import { PlayersGateway } from '../gateways/players.gateway';
import { Player } from '../models/player';
import { Subject } from 'rxjs';

type SocketList = Socket[];

@Injectable()
export class OnlinePlayersService implements OnModuleInit {

  private readonly verifyPlayerTimeout = 10 * 1000; // 10 seconds
  private logger = new Logger(OnlinePlayersService.name);
  private sockets = new Map<string, SocketList>();
  private _playerLeft = new Subject<string>();

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
        const sockets = this.sockets.get(player.id) || [];
        if (!sockets.includes(socket)) {
          this.logger.debug(`${player.name} connected`);
          this.sockets.set(player.id, [ ...sockets, socket ]);
        }
      }
    });

    this.playersGateway.playerDisconnected.subscribe(socket => {
      if (socket.request.user.logged_in) {
        const player = socket.request.user as Player;
        this.logger.debug(`${player.name} disconnected`);
        const sockets = this.getSocketsForPlayer(player.id);
        this.sockets.set(player.id, sockets.filter(s => s !== socket));
        setTimeout(() => this.verifyPlayer(player.id), this.verifyPlayerTimeout);
      }
    });
  }

  getSocketsForPlayer(playerId: string) {
    return this.sockets.get(playerId) || [];
  }

  private verifyPlayer(playerId: string) {
    const sockets = this.sockets.get(playerId);
    if (sockets.length === 0) {
      this._playerLeft.next(playerId);
    }
  }

}
