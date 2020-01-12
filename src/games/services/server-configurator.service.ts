import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GameServer } from '@/game-servers/models/game-server';
import { Game } from '../models/game';
import { Environment } from '@/environment/environment';
import { generate } from 'generate-password';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { RconFactoryService } from './rcon-factory.service';

@Injectable()
export class ServerConfiguratorService {

  private logger = new Logger(ServerConfiguratorService.name);

  constructor(
    private environment: Environment,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private queueConfigService: QueueConfigService,
    private rconFactoryService: RconFactoryService,
  ) { }

  async configureServer(server: GameServer, game: Game) {
    this.logger.log(`configuring server ${server.name}...`);
    this.logger.debug(`[${server.name}] using rcon password ${server.rconPassword}`);

    try {
      const rcon = await this.rconFactoryService.createRcon(server);

      const logAddress = `${this.environment.logRelayAddress}:${this.environment.logRelayPort}`;
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
      const rcon = await this.rconFactoryService.createRcon(server);

      const logAddress = `${this.environment.logRelayAddress}:${this.environment.logRelayPort}`;
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
