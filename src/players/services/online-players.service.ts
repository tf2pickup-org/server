import { Events } from '@/events/events';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Socket } from 'socket.io';
import { PlayersGateway } from '../gateways/players.gateway';

type SocketList = Socket[];

@Injectable()
export class OnlinePlayersService implements OnModuleInit {
  private readonly verifyPlayerTimeout = 10 * 1000; // 10 seconds
  private logger = new Logger(OnlinePlayersService.name);
  private sockets = new Map<string, SocketList>();

  constructor(private playersGateway: PlayersGateway, private events: Events) {}

  onModuleInit() {
    this.playersGateway.playerConnected.subscribe((socket) => {
      if (socket.user) {
        const player = socket.user;
        const sockets = this.sockets.get(player.id) || [];
        if (!sockets.includes(socket)) {
          this.logger.debug(`${player.name} connected`);
          this.sockets.set(player.id, [...sockets, socket]);
        }
      }
    });

    this.playersGateway.playerDisconnected.subscribe((socket) => {
      if (socket.user) {
        const player = socket.user;
        this.logger.debug(`${player.name} disconnected`);
        const sockets = this.getSocketsForPlayer(player.id);
        this.sockets.set(
          player.id,
          sockets.filter((s) => s !== socket),
        );
        setTimeout(
          () => this.verifyPlayer(player.id),
          this.verifyPlayerTimeout,
        );
      }
    });
  }

  getSocketsForPlayer(playerId: string) {
    return this.sockets.get(playerId) ?? [];
  }

  private verifyPlayer(playerId: string) {
    const sockets = this.sockets.get(playerId);
    if (sockets.length === 0) {
      this.events.playerDisconnects.next({ playerId });
    }
  }
}
