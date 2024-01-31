import { GameServerControls } from '@/game-servers/interfaces/game-server-controls';
import { createRcon } from '@/utils/create-rcon';
import { Rcon } from 'rcon-client/lib';
import { Reservation } from '@tf2pickup-org/serveme-tf-client';

export class ServemeTfServerControls implements GameServerControls {
  constructor(private readonly reservation: Reservation) {}

  async start(): Promise<void> {
    await this.reservation.waitForStarted();
  }

  async rcon(): Promise<Rcon> {
    return await createRcon({
      host: this.reservation.server.ip,
      port: parseInt(this.reservation.server.port, 10),
      rconPassword: this.reservation.rcon,
    });
  }

  getLogsecret(): string {
    return this.reservation.logSecret;
  }
}
