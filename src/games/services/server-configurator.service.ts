import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GameServer } from '@/game-servers/models/game-server';
import { Game } from '../models/game';
import { Environment } from '@/environment/environment';
import { generate } from 'generate-password';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { RconFactoryService } from './rcon-factory.service';
import { logAddressAdd, changelevel, execConfig, setPassword, addGamePlayer, logAddressDel, delAllGamePlayers,
  kickAll,
  enablePlayerWhitelist,
  disablePlayerWhitelist} from '../utils/rcon-commands';

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
      await rcon.send(logAddressAdd(logAddress));

      this.logger.debug(`[${server.name}] kicking all players...`);
      await rcon.send(kickAll());
      this.logger.debug(`[${server.name}] changing map to ${game.map}...`);
      await rcon.send(changelevel(game.map));

      for (const configName of this.queueConfigService.queueConfig.execConfigs) {
        this.logger.debug(`[${server.name}] executing ${configName}...`);
        await rcon.send(execConfig(configName));
      }

      const password = generate({ length: 10, numbers: true, uppercase: true });
      this.logger.debug(`[${server.name}] settings password to ${password}...`);
      await rcon.send(setPassword(password));

      for (const slot of game.slots) {
        const player = await this.playersService.getById(slot.playerId);
        const team = parseInt(slot.teamId, 10) + 2;

        const playerName = deburr(player.name);
        const cmd = addGamePlayer(player.steamId, playerName, team, slot.gameClass);
        this.logger.debug(`[${server.name}] ${cmd}`);
        await rcon.send(cmd);
      }

      await rcon.send(enablePlayerWhitelist());
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
      await rcon.send(logAddressDel(logAddress));
      await rcon.send(delAllGamePlayers());
      await rcon.send(disablePlayerWhitelist());
      await rcon.end();
      this.logger.log(`[${server.name}] server cleaned up`);
    } catch (error) {
      throw new Error(`could not cleanup server ${server.name} (${error.message})`);
    }
  }

}
