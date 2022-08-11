import { Events } from '@/events/events';
import { NoFreeGameServerAvailableError } from '@/game-servers/errors/no-free-game-server-available.error';
import { GameServerProvider } from '@/game-servers/game-server-provider';
import { GameServerControls } from '@/game-servers/interfaces/game-server-controls';
import { GameServerOption } from '@/game-servers/interfaces/game-server-option';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { from } from 'rxjs';
import { delay, exhaustMap, filter, take } from 'rxjs/operators';
import {
  ServemeTfGameServer,
  ServemeTfGameServerDocument,
} from '../models/serveme-tf-game-server';
import { ServemeTfServerControls } from '../serveme-tf-server-controls';
import { ServemeTfApiService } from './serveme-tf-api.service';
import { endReservationDelay } from '../config';

@Injectable()
export class ServemeTfService implements GameServerProvider, OnModuleInit {
  readonly gameServerProviderName = 'serveme.tf';
  private logger = new Logger(ServemeTfService.name);

  constructor(
    private gameServersService: GameServersService,
    private servemeTfApiService: ServemeTfApiService,
    @InjectModel(ServemeTfGameServer.name)
    private servemeTfGameServerModel: Model<ServemeTfGameServerDocument>,
    private events: Events,
  ) {}

  onModuleInit() {
    this.gameServersService.registerProvider(this);
    this.logger.log('serveme.tf integration enabled');
  }

  async getById(gameServerId: string): Promise<ServemeTfGameServer> {
    return plainToInstance(
      ServemeTfGameServer,
      await this.servemeTfGameServerModel
        .findById(gameServerId)
        .orFail()
        .lean()
        .exec(),
    );
  }

  async onGameServerAssigned({ gameId }: { gameId: string }): Promise<void> {
    // end the reservation when the game ends
    this.events.gameChanges
      .pipe(
        filter(({ newGame }) => newGame.id === gameId),
        filter(({ newGame }) => !!newGame.gameServer),
        filter(
          ({ oldGame, newGame }) =>
            oldGame.isInProgress() && !newGame.isInProgress(),
        ),
        take(1),
        delay(endReservationDelay),
        exhaustMap(({ newGame }) => from(this.getById(newGame.gameServer.id))),
      )
      .subscribe(
        async (gameServer) =>
          await this.servemeTfApiService.endServerReservation(
            gameServer.reservation.id,
          ),
      );
  }

  async getControls(id: string): Promise<GameServerControls> {
    const gameServer = plainToInstance(
      ServemeTfGameServer,
      await this.servemeTfGameServerModel.findById(id).orFail().lean().exec(),
    );
    return new ServemeTfServerControls(gameServer, this.servemeTfApiService);
  }

  async findFirstFreeGameServer(): Promise<GameServerOption> {
    try {
      const { reservation } = await this.servemeTfApiService.reserveServer();
      const { id } = await this.servemeTfGameServerModel.create({
        name: reservation.server.name,
        address: reservation.server.ip,
        port: reservation.server.port,
        reservation: {
          id: reservation.id,
          startsAt: new Date(reservation.starts_at),
          endsAt: new Date(reservation.ends_at),
          serverId: reservation.server.id,
          password: reservation.password,
          rcon: reservation.rcon,
          logsecret: reservation.logsecret,
          steamId: reservation.steam_uid,
        },
      });
      const gameServer = plainToInstance(
        ServemeTfGameServer,
        await this.servemeTfGameServerModel.findById(id).lean().exec(),
      );
      return {
        id: gameServer.id,
        name: gameServer.name,
        address: gameServer.address,
        port: parseInt(gameServer.port, 10),
      };
    } catch (error) {
      this.logger.error(`failed creating reservation: ${error.toString()}`);
      throw new NoFreeGameServerAvailableError();
    }
  }
}
