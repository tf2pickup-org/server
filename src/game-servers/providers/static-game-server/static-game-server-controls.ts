import { svLogsecret } from '@/game-coordinator/utils/rcon-commands';
import { GameServerControls } from '@/game-servers/interfaces/game-server-controls';
import { createRcon } from '@/utils/create-rcon';
import { Rcon } from 'rcon-client/lib';
import { StaticGameServer } from './models/static-game-server';
import { generateLogsecret } from './utils/generate-logsecret';

export class StaticGameServerControls implements GameServerControls {
  constructor(private readonly gameServer: StaticGameServer) {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async start() {} // the server is always already started

  async rcon(): Promise<Rcon> {
    return await createRcon({
      host: this.gameServer.internalIpAddress,
      port: parseInt(this.gameServer.port, 10),
      rconPassword: this.gameServer.rconPassword,
    });
  }

  async getLogsecret(): Promise<string> {
    const logsecret = generateLogsecret();
    let rcon: Rcon;
    try {
      rcon = await this.rcon();
      await rcon.send(svLogsecret(logsecret));
      return logsecret;
    } finally {
      await rcon?.end();
    }
  }
}
