import { GameServerControls } from '@/game-servers/interfaces/game-server-controls';
import { createRcon } from '@/utils/create-rcon';
import { Rcon } from 'rcon-client/lib';
import { ServemeTfReservation } from './models/serveme-tf-reservation';
import { Client } from '@tf2pickup-org/serveme-tf-client';

export class ServemeTfServerControls implements GameServerControls {
  constructor(
    private readonly reservation: ServemeTfReservation,
    private readonly servemeTfClient: Client,
  ) {}

  async start(): Promise<void> {
    const reservation = await this.servemeTfClient.fetch(
      this.reservation.reservationId,
    );
    await reservation.waitForStarted();
  }

  async rcon(): Promise<Rcon> {
    return await createRcon({
      host: this.reservation.server.ip,
      port: parseInt(this.reservation.server.port, 10),
      rconPassword: this.reservation.rcon,
    });
  }

  getLogsecret(): string {
    return this.reservation.logsecret;
  }
}
