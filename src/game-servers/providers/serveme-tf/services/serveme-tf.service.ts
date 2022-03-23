import { Events } from '@/events/events';
import { NoFreeGameServerAvailableError } from '@/game-servers/errors/no-free-game-server-available.error';
import { GameServerProvider } from '@/game-servers/game-server-provider';
import { GameServer } from '@/game-servers/models/game-server';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { delay, filter } from 'rxjs/operators';
import {
  isServemeTfGameServer,
  ServemeTfGameServer,
  ServemeTfGameServerDocument,
} from '../models/serveme-tf-game-server';
import { ServemeTfApiService } from './serveme-tf-api.service';

@Injectable()
export class ServemeTfService implements GameServerProvider, OnModuleInit {
  readonly gameServerProviderName = 'serveme.tf';
  readonly implementingClass = ServemeTfGameServer;
  private logger = new Logger(ServemeTfService.name);

  constructor(
    private gameServersService: GameServersService,
    private servemeTfApiService: ServemeTfApiService,
    @InjectModel(ServemeTfGameServer.name)
    private servemeTfGameServerModel: Model<ServemeTfGameServerDocument>,
    private events: Events,
  ) {}

  async onModuleInit() {
    // end the reservation when the game ends
    this.events.gameServerUpdated
      .pipe(
        filter(({ newGameServer }) => isServemeTfGameServer(newGameServer)),
        filter(
          ({ oldGameServer, newGameServer }) =>
            !!oldGameServer.game && !newGameServer.game,
        ),
        delay(30 * 1000),
      )
      .subscribe(
        async ({ newGameServer }) =>
          await this.servemeTfApiService.endServerReservation(
            (newGameServer as ServemeTfGameServer).reservation.id,
          ),
      );

    this.gameServersService.registerProvider(this);
    this.logger.log('serveme.tf integration enabled');
  }

  async findFirstFreeGameServer(): Promise<GameServer> {
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
      return plainToInstance(
        ServemeTfGameServer,
        await this.servemeTfGameServerModel.findById(id).lean().exec(),
      );
    } catch (error) {
      this.logger.error(`failed creating reservation: ${error}`);
      throw new NoFreeGameServerAvailableError();
    }
  }
}
