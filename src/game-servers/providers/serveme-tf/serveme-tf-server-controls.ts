import { GameServerControls } from '@/game-servers/interfaces/game-server-controls';
import { createRcon } from '@/utils/create-rcon';
import { Rcon } from 'rcon-client/lib';
import { ServemeTfReservation } from './models/serveme-tf-reservation';
import { ServemeTfApiService } from './services/serveme-tf-api.service';

export class ServemeTfServerControls implements GameServerControls {
  constructor(
    private readonly reservation: ServemeTfReservation,
    private readonly servemeTfApiService: ServemeTfApiService,
  ) {}

  async start(): Promise<void> {
    await this.servemeTfApiService.waitForServerToStart(this.reservation.id);
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
