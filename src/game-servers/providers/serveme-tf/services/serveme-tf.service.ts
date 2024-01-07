import { NoFreeGameServerAvailableError } from '@/game-servers/errors/no-free-game-server-available.error';
import {
  GameServerProvider,
  ReleaseGameServerParams,
  TakeGameServerParams,
} from '@/game-servers/game-server-provider';
import { GameServerControls } from '@/game-servers/interfaces/game-server-controls';
import { GameServerOption } from '@/game-servers/interfaces/game-server-option';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model, Types } from 'mongoose';
import { ServemeTfServerControls } from '../serveme-tf-server-controls';
import { endReservationDelay } from '../config';
import { ServemeTfReservation } from '../models/serveme-tf-reservation';
import { GameServerDetails } from '@/game-servers/interfaces/game-server-details';
import { assertIsError } from '@/utils/assert-is-error';
import {
  Client,
  Reservation,
  ServerId,
} from '@tf2pickup-org/serveme-tf-client';
import { ServemeTfConfigurationService } from './serveme-tf-configuration.service';
import { sample } from 'lodash';
import { SERVEME_TF_CLIENT } from '../serveme-tf-client.token';
@Injectable()
export class ServemeTfService implements GameServerProvider, OnModuleInit {
  readonly gameServerProviderName = 'serveme.tf';
  private readonly logger = new Logger(ServemeTfService.name);

  constructor(
    private gameServersService: GameServersService,
    @InjectModel(ServemeTfReservation.name)
    private servemeTfReservationModel: Model<ServemeTfReservation>,
    @Inject(SERVEME_TF_CLIENT)
    private readonly servemeTfClient: Client,
    private servemeTfConfigurationService: ServemeTfConfigurationService,
  ) {}

  onModuleInit() {
    this.gameServersService.registerProvider(this);
    this.logger.verbose('serveme.tf integration enabled');
  }

  async getById(
    reservationId: string | Types.ObjectId,
  ): Promise<ServemeTfReservation> {
    return plainToInstance(
      ServemeTfReservation,
      await this.servemeTfReservationModel
        .findById(reservationId)
        .orFail()
        .lean()
        .exec(),
    );
  }

  async findGameServerOptions(): Promise<GameServerOption[]> {
    const { servers } = await this.servemeTfClient.findOptions();
    return servers.map((server) => ({
      id: `${server.id}`,
      name: server.name,
      address: server.ip,
      port: parseInt(server.port, 10),
      flag: server.flag,
    }));
  }

  async takeGameServer({
    gameServerId,
  }: TakeGameServerParams): Promise<GameServerDetails> {
    const reservation = await this.servemeTfClient.create({
      serverId: parseInt(gameServerId, 10) as ServerId,
      enableDemosTf: true,
      enablePlugins: true,
    });

    const id = await this.storeReservation(reservation);
    return {
      id,
      name: reservation.server.name,
      address: reservation.server.ip,
      port: parseInt(reservation.server.port, 10),
    };
  }

  releaseGameServer({ gameServerId }: ReleaseGameServerParams) {
    setTimeout(async () => {
      const { reservationId } = await this.getById(gameServerId);
      const reservation = await this.servemeTfClient.fetch(reservationId);
      reservation.end().catch((error) => {
        assertIsError(error);
        this.logger.error(
          `failed to end reservation ${reservationId}: ${error.toString()}`,
        );
      });
    }, endReservationDelay);
  }

  async takeFirstFreeGameServer(): Promise<GameServerDetails> {
    try {
      const { servers } = await this.servemeTfClient.findOptions();
      const [preferredRegion, banGameservers] = await Promise.all([
        this.servemeTfConfigurationService.getPreferredRegion(),
        this.servemeTfConfigurationService.getBannedGameservers(),
      ]);

      const matchingServers = servers
        // make sure we don't take a SDR server
        // https://partner.steamgames.com/doc/features/multiplayer/steamdatagramrelay
        .filter((s) => s.sdr === false)
        .filter((s) => (preferredRegion ? s.flag === preferredRegion : true))
        .filter((s) => banGameservers.every((ban) => !s.name.includes(ban)));
      const server = sample(matchingServers);
      if (!server) {
        throw new Error(
          'could not find any gameservers meeting given criteria',
        );
      }

      const reservation = await this.servemeTfClient.create({
        serverId: server.id,
        enableDemosTf: true,
        enablePlugins: true,
      });

      const id = await this.storeReservation(reservation);
      return {
        id,
        name: reservation.server.name,
        address: reservation.server.ip,
        port: parseInt(reservation.server.port, 10),
      };
    } catch (error) {
      assertIsError(error);
      this.logger.error(`failed to create reservation: ${error.toString()}`);
      throw new NoFreeGameServerAvailableError();
    }
  }

  async getControls(id: string): Promise<GameServerControls> {
    return new ServemeTfServerControls(
      await this.getById(id),
      this.servemeTfClient,
    );
  }

  private async storeReservation(reservation: Reservation): Promise<string> {
    const { _id } = await this.servemeTfReservationModel.create({
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      serverId: reservation.serverId,
      password: reservation.password,
      rcon: reservation.rcon,
      tvPassword: reservation.tvPassword,
      tvRelayPassword: reservation.tvRelayPassword,
      status: reservation.status,
      reservationId: reservation.id,
      logsecret: reservation.logSecret,
      ended: reservation.ended,
      steamId: reservation.reservedBy,
      server: {
        id: reservation.server.id,
        name: reservation.server.name,
        flag: reservation.server.flag,
        ip: reservation.server.ip,
        port: reservation.server.port,
        latitude: reservation.server.latitude,
        longitude: reservation.server.longitude,
      },
    });
    return _id.toString();
  }
}
