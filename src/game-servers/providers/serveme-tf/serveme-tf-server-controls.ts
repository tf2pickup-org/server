import { GameServerControls } from '@/game-servers/interfaces/game-server-controls';
import { createRcon } from '@/utils/create-rcon';
import { Rcon } from 'rcon-client/lib';
import { ServemeTfGameServer } from './models/serveme-tf-game-server';
import { ServemeTfApiService } from './services/serveme-tf-api.service';

export class ServemeTfServerControls implements GameServerControls {
  constructor(
    private readonly gameServer: ServemeTfGameServer,
    private readonly servemeTfApiService: ServemeTfApiService,
  ) {}

  async start(): Promise<void> {
    await this.servemeTfApiService.waitForServerToStart(
      this.gameServer.reservation.id,
    );
  }

  async rcon(): Promise<Rcon> {
    return await createRcon({
      host: this.gameServer.address,
      port: parseInt(this.gameServer.port, 10),
      rconPassword: this.gameServer.reservation.rcon,
    });
  }

  getLogsecret(): string {
    return this.gameServer.reservation.logsecret;
  }
}
