import { Events } from '@/events/events';
import { NoFreeGameServerAvailableError } from '@/game-servers/errors/no-free-game-server-available.error';
import { GameServerProvider } from '@/game-servers/game-server-provider';
import { GameServerControls } from '@/game-servers/interfaces/game-server-controls';
import { GameServerOption } from '@/game-servers/interfaces/game-server-option';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model, Types } from 'mongoose';
import { ServemeTfServerControls } from '../serveme-tf-server-controls';
import { ServemeTfApiService } from './serveme-tf-api.service';
import { endReservationDelay } from '../config';
import {
  ServemeTfReservation,
  ServemeTfReservationDocument,
} from '../models/serveme-tf-reservation';
import { ReservationStatus } from '../models/reservation-status';
import { GameServer } from '@/games/models/game-server';
import { GameServerDetails } from '@/game-servers/interfaces/game-server-details';

type ValueType<T> = T extends Promise<infer U> ? U : T;

const toReservationStatus = (
  status: ValueType<
    ReturnType<ServemeTfApiService['reserveServer']>
  >['reservation']['status'],
): ReservationStatus => {
  switch (status) {
    case 'Waiting to start':
      return ReservationStatus.waitingToStart;

    case 'Starting':
      return ReservationStatus.starting;

    case 'Server updating, please be patient':
      return ReservationStatus.serverUpdating;

    case 'Ready':
    case 'SDR Ready':
      return ReservationStatus.ready;

    case 'Ending':
      return ReservationStatus.ending;

    case 'Ended':
      return ReservationStatus.ended;

    default:
      return ReservationStatus.unknown;
  }
};

@Injectable()
export class ServemeTfService implements GameServerProvider, OnModuleInit {
  readonly gameServerProviderName = 'serveme.tf';
  private readonly logger = new Logger(ServemeTfService.name);

  constructor(
    private gameServersService: GameServersService,
    private servemeTfApiService: ServemeTfApiService,
    @InjectModel(ServemeTfReservation.name)
    private servemeTfReservationModel: Model<ServemeTfReservationDocument>,
    private events: Events,
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
    return (await this.servemeTfApiService.listServers()).map((option) => ({
      id: `${option.id}`,
      name: option.name,
      address: option.ip,
      port: parseInt(option.port, 10),
    }));
  }

  async takeGameServer({ gameServerId }): Promise<GameServer> {
    const { reservation } = await this.servemeTfApiService.reserveServer(
      parseInt(gameServerId, 10),
    );
    const id = await this.storeReservation(reservation);
    return {
      id,
      provider: this.gameServerProviderName,
      name: reservation.server.name,
      address: reservation.server.ip,
      port: parseInt(reservation.server.port, 10),
    };
  }

  releaseGameServer({ gameServerId }) {
    setTimeout(async () => {
      const reservation = await this.getById(gameServerId);
      await this.servemeTfApiService.endServerReservation(
        reservation.reservationId,
      );
    }, endReservationDelay);
  }

  async takeFirstFreeGameServer(): Promise<GameServerDetails> {
    try {
      const { reservation } = await this.servemeTfApiService.reserveServer();
      const id = await this.storeReservation(reservation);
      return {
        id,
        name: reservation.server.name,
        address: reservation.server.ip,
        port: parseInt(reservation.server.port, 10),
      };
    } catch (error) {
      this.logger.error(`failed to create reservation: ${error.toString()}`);
      throw new NoFreeGameServerAvailableError();
    }
  }

  async getControls(id: string): Promise<GameServerControls> {
    return new ServemeTfServerControls(
      await this.getById(id),
      this.servemeTfApiService,
    );
  }

  private async storeReservation(
    reservation: Awaited<
      ReturnType<ServemeTfApiService['reserveServer']>
    >['reservation'],
  ): Promise<string> {
    const { id } = await this.servemeTfReservationModel.create({
      startsAt: new Date(reservation.starts_at),
      endsAt: new Date(reservation.ends_at),
      serverId: reservation.server_id,
      password: reservation.password,
      rcon: reservation.rcon,
      tvPassword: reservation.tv_password,
      tvRelayPassword: reservation.tv_relaypassword,
      status: toReservationStatus(reservation.status),
      reservationId: reservation.id,
      logsecret: reservation.logsecret,
      ended: reservation.ended,
      steamId: reservation.steam_uid,
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
    return id;
  }
}
