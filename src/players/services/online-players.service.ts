import { Events } from '@/events/events';
import { QueueService } from '@/queue/services/queue.service';
import { extractClientIp } from '@/shared/extract-client-ip';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { isNull, isUndefined } from 'lodash';
import { Types } from 'mongoose';
import { Socket } from 'socket.io';
import { PlayersGateway } from '../gateways/players.gateway';
import { PlayerId } from '../types/player-id';

type SocketList = Socket[];

@Injectable()
export class OnlinePlayersService implements OnModuleInit, OnModuleDestroy {
  private readonly verifyPlayerTimeout = 10 * 1000; // 10 seconds
  private logger = new Logger(OnlinePlayersService.name);
  private sockets = new Map<string, SocketList>();
  private timers: NodeJS.Timeout[] = [];
  private _onlinePlayers = new Set<string>();

  get onlinePlayers(): PlayerId[] {
    return Array.from(this._onlinePlayers).map(
      (id) => new Types.ObjectId(id) as PlayerId,
    );
  }

  constructor(
    private readonly playersGateway: PlayersGateway,
    private readonly events: Events,
    private readonly queueService: QueueService,
  ) {}

  onModuleInit() {
    this.playersGateway.playerConnected.subscribe((socket) => {
      if (socket.user) {
        const player = socket.user;
        const sockets = this.getSocketsForPlayer(player._id);
        if (!sockets.includes(socket)) {
          const ipAddress =
            extractClientIp(socket.handshake.headers) ??
            socket.handshake.address;
          this.logger.debug(`${player.name} connected from ${ipAddress}`);
          const isAlreadyConnected = sockets.find(
            (socket) => socket.conn.remoteAddress === ipAddress,
          );
          sockets.push(socket);
          if (!isAlreadyConnected) {
            this.events.playerConnects.next({
              playerId: player._id,
              metadata: {
                ipAddress,
                userAgent: socket.handshake.headers['user-agent'],
              },
            });
          }
        }
      }
    });

    this.playersGateway.playerDisconnected.subscribe((socket) => {
      if (socket.user) {
        const player = socket.user;
        const ipAddress =
          extractClientIp(socket.handshake.headers) ?? socket.handshake.address;
        this.logger.debug(`${player.name} disconnected (${ipAddress})`);
        const sockets = this.getSocketsForPlayer(player._id);
        const index = sockets.indexOf(socket);
        if (index > -1) {
          sockets.splice(index, 1);
        }

        this.timers.push(
          setTimeout(
            () => this.verifyPlayer(player._id),
            this.verifyPlayerTimeout,
          ),
        );
      }
    });

    this.events.playerConnects.subscribe(({ playerId }) =>
      this._onlinePlayers.add(playerId.toString()),
    );
    this.events.playerDisconnects.subscribe(({ playerId }) =>
      this._onlinePlayers.delete(playerId.toString()),
    );

    setTimeout(() => {
      this.queueService.slots
        .map((slot) => slot.playerId)
        .filter((playerId) => !isNull(playerId))
        .forEach((playerId) => this.verifyPlayer(playerId!));
    }, this.verifyPlayerTimeout);
  }

  onModuleDestroy() {
    this.timers.forEach((t) => clearTimeout(t));
  }

  getSocketsForPlayer(playerId: PlayerId): SocketList {
    const playerIdStr = playerId.toString();
    if (!this.sockets.has(playerIdStr)) {
      this.sockets.set(playerIdStr, []);
    }
    return this.sockets.get(playerIdStr)!;
  }

  private verifyPlayer(playerId: PlayerId) {
    this.logger.debug(`verifying online status for ${playerId.toString()}`);
    const sockets = this.sockets.get(playerId.toString());
    if (isUndefined(sockets) || sockets.length === 0) {
      this.events.playerDisconnects.next({ playerId });
    }
  }
}
