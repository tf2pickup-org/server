import { Events } from '@/events/events';
import { PlayerOnlineStatusChanged } from '@/player-actions-logger/player-actions/player-online-status-changed';
import { PlayerActionLoggerService } from '@/player-actions-logger/services/player-action-logger.service';
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

  constructor(
    private playersGateway: PlayersGateway,
    private events: Events,
    private playerActionLoggerService: PlayerActionLoggerService,
  ) {}

  onModuleInit() {
    this.playersGateway.playerConnected.subscribe((socket) => {
      if (socket.user) {
        const player = socket.user;
        const sockets = this.sockets.get(player.id) || [];
        if (!sockets.includes(socket)) {
          this.logger.debug(`${player.name} connected`);
          this.playerActionLoggerService.logAction(
            new PlayerOnlineStatusChanged(
              player,
              {
                ipAddress: socket.conn.remoteAddress,
              },
              true,
            ),
          );
          this.sockets.set(player.id, [...sockets, socket]);
          if (sockets.length === 0) {
            this.events.playerConnects.next({ playerId: player.id });
          }
        }
      }
    });

    this.playersGateway.playerDisconnected.subscribe((socket) => {
      if (socket.user) {
        const player = socket.user;
        this.logger.debug(`${player.name} disconnected`);
        this.playerActionLoggerService.logAction(
          new PlayerOnlineStatusChanged(
            player,
            {
              ipAddress: socket.conn.remoteAddress,
            },
            false,
          ),
        );
        const sockets = this.getSocketsForPlayer(player.id);
        this.sockets.set(
          player.id,
          sockets.filter((s) => s !== socket),
        );
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
    return this.sockets.get(playerId) ?? [];
  }

  private verifyPlayer(playerId: string) {
    const sockets = this.sockets.get(playerId);
    if (sockets.length === 0) {
      this.events.playerDisconnects.next({ playerId });
    }
  }
}
