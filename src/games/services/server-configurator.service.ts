import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GameServer } from '@/game-servers/models/game-server';
import { Game } from '../models/game';
import { Rcon } from 'rcon-client';
import { ConfigService } from '@/config/config.service';
import { generate } from 'generate-password';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';

@Injectable()
export class ServerConfiguratorService {

  private logger = new Logger(ServerConfiguratorService.name);

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private queueConfigService: QueueConfigService,
  ) { }

  async configureServer(server: GameServer, game: Game) {
    this.logger.log(`configuring server ${server.name}...`);
    this.logger.debug(`[${server.name}] using rcon password ${server.rconPassword}`);

    try {
      const rcon = new Rcon({
        host: server.address,
        port: parseInt(server.port, 10),
        password: server.rconPassword,
        timeout: 30000,
      });
      await rcon.connect();

      const logAddress = `${this.configService.logRelayAddress}:${this.configService.logRelayPort}`;
      this.logger.debug(`[${server.name}] adding log address ${logAddress}...`);
      await rcon.send(`logaddress_add ${logAddress}`);

      this.logger.debug(`[${server.name}] kicking all players...`);
      await rcon.send(`kickall`);
      this.logger.debug(`[${server.name}] changing map to ${game.map}...`);
      await rcon.send(`changelevel ${game.map}`);

      for (const execConfig of this.queueConfigService.queueConfig.execConfigs) {
        this.logger.debug(`[${server.name}] executing ${execConfig}...`);
        await rcon.send(`exec ${execConfig}`);
      }

      const password = generate({ length: 10, numbers: true, uppercase: true });
      this.logger.debug(`[${server.name}] settings password to ${password}...`);
      await rcon.send(`sv_password ${password}`);

      for (const slot of game.slots) {
        const player = await this.playersService.getById(slot.playerId);
        const team = parseInt(slot.teamId, 10) + 2;

        const cmd = [
          `sm_game_player_add ${player.steamId}`,
          `-name "${player.name}"`,
          `-team ${team}`,
          `-class ${slot.gameClass}`,
        ].join(' ');
        this.logger.debug(`[${server.name}] ${cmd}`);
        await rcon.send(cmd);
      }

      await rcon.end();
      this.logger.debug(`[${server.name}] server ready.`);

      const connectString = `connect ${server.address}:${server.port}; password ${password}`;
      this.logger.log(`[${server.name}] ${connectString}`);

      return {
        connectString,
      };
    } catch (error) {
      throw new Error(`could not configure server ${server.name} (${error.message})`);
    }
  }

  async cleanupServer(server: GameServer) {
    try {
      const rcon = new Rcon({
        host: server.address,
        port: parseInt(server.port, 10),
        password: server.rconPassword,
        timeout: 30000,
      });
      await rcon.connect();

      const logAddress = `${this.configService.logRelayAddress}:${this.configService.logRelayPort}`;
      this.logger.debug(`[${server.name}] removing log address ${logAddress}...`);
      await rcon.send(`logaddress_del ${logAddress}`);
      await rcon.send('sm_game_player_delall');
      await rcon.end();
      this.logger.log(`[${server.name}] server cleaned up`);
    } catch (error) {
      throw new Error(`could not cleanup server ${server.name} (${error.message})`);
    }
  }

}
