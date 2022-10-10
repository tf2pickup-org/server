import { Events } from '@/events/events';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Socket } from 'socket.io';
import { PlayersGateway } from '../gateways/players.gateway';

type SocketList = Socket[];

@Injectable()
export class OnlinePlayersService implements OnModuleInit, OnModuleDestroy {
  private readonly verifyPlayerTimeout = 10 * 1000; // 10 seconds
  private logger = new Logger(OnlinePlayersService.name);
  private sockets = new Map<string, SocketList>();
  private timers: NodeJS.Timeout[] = [];
  private _onlinePlayers = new Set<string>();

  get onlinePlayers(): string[] {
    return Array.from(this._onlinePlayers);
  }

  constructor(private playersGateway: PlayersGateway, private events: Events) {}

  onModuleInit() {
    this.playersGateway.playerConnected.subscribe((socket) => {
      if (socket.user) {
        const player = socket.user;
        const sockets = this.getSocketsForPlayer(player.id);
        if (!sockets.includes(socket)) {
          const ipAddress = socket.conn.remoteAddress;
          this.logger.debug(`${player.name} connected from ${ipAddress}`);
          const isAlreadyConnected = sockets.find(
            (socket) => socket.conn.remoteAddress === ipAddress,
          );
          sockets.push(socket);
          if (!isAlreadyConnected) {
            this.events.playerConnects.next({
              playerId: player.id,
              metadata: {
                ipAddress,
              },
            });
          }
        }
      }
    });

    this.playersGateway.playerDisconnected.subscribe((socket) => {
      if (socket.user) {
        const player = socket.user;
        const ipAddress = socket.conn.remoteAddress;
        this.logger.debug(`${player.name} disconnected (${ipAddress})`);
        const sockets = this.getSocketsForPlayer(player.id);
        const index = sockets.indexOf(socket);
        if (index > -1) {
          sockets.splice(index, 1);
        }

        this.timers.push(
          setTimeout(
            () => this.verifyPlayer(player.id),
            this.verifyPlayerTimeout,
          ),
        );
      }
    });

    this.events.playerConnects.subscribe(({ playerId }) =>
      this._onlinePlayers.add(playerId),
    );
    this.events.playerDisconnects.subscribe(({ playerId }) =>
      this._onlinePlayers.delete(playerId),
    );
  }

  onModuleDestroy() {
    this.timers.forEach((t) => clearTimeout(t));
  }

  getSocketsForPlayer(playerId: string) {
    if (!this.sockets.has(playerId)) {
      this.sockets.set(playerId, []);
    }
    return this.sockets.get(playerId);
  }

  private verifyPlayer(playerId: string) {
    const sockets = this.sockets.get(playerId);
    if (sockets.length === 0) {
      this.events.playerDisconnects.next({ playerId });
    }
  }
}
