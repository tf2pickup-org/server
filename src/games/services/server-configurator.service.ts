import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GameServer } from '@/game-servers/models/game-server';
import { Game } from '../models/game';
import { Environment } from '@/environment/environment';
import { generate } from 'generate-password';
import { PlayersService } from '@/players/services/players.service';
import { RconFactoryService } from './rcon-factory.service';
import {
  logAddressAdd,
  changelevel,
  execConfig,
  setPassword,
  addGamePlayer,
  logAddressDel,
  delAllGamePlayers,
  kickAll,
  enablePlayerWhitelist,
  disablePlayerWhitelist,
  tvPort,
  tvPassword,
  tftrueWhitelistId,
} from '../utils/rcon-commands';
import { deburr } from 'lodash';
import { extractConVarValue } from '../utils/extract-con-var-value';
import { Rcon } from 'rcon-client/lib';
import { MapPoolService } from '@/queue/services/map-pool.service';
import { ConfigurationService } from '@/configuration/services/configuration.service';

const wait = () => new Promise((resolve) => setTimeout(resolve, 10 * 1000));

@Injectable()
export class ServerConfiguratorService {
  private logger = new Logger(ServerConfiguratorService.name);

  constructor(
    private environment: Environment,
    @Inject(forwardRef(() => PlayersService))
    private playersService: PlayersService,
    private rconFactoryService: RconFactoryService,
    private mapPoolService: MapPoolService,
    private configurationService: ConfigurationService,
  ) {}

  async configureServer(server: GameServer, game: Game) {
    this.logger.verbose(`configuring server ${server.name}...`);
    this.logger.debug(
      `[${server.name}] using rcon password ${server.rconPassword}`,
    );
    const whitelistId = await this.configurationService.getWhitelistId();

    let rcon: Rcon;
    try {
      rcon = await this.rconFactoryService.createRcon(server);

      const logAddress = `${this.environment.logRelayAddress}:${this.environment.logRelayPort}`;
      this.logger.debug(`[${server.name}] adding log address ${logAddress}...`);
      await rcon.send(logAddressAdd(logAddress));

      this.logger.debug(`[${server.name}] kicking all players...`);
      await rcon.send(kickAll());
      this.logger.debug(`[${server.name}] changing map to ${game.map}...`);
      await rcon.send(changelevel(game.map));

      // source servers need a moment after the map has been changed
      await wait();

      const maps = await this.mapPoolService.getMaps();
      const config = maps.find((m) => m.name === game.map)?.execConfig;
      if (config) {
        this.logger.debug(`[${server.name}] executing ${config}...`);
        await rcon.send(execConfig(config));
        await wait();
      }

      if (whitelistId) {
        this.logger.debug(
          `[${server.name}] setting whitelist ${whitelistId}...`,
        );
        await rcon.send(tftrueWhitelistId(whitelistId));
      }

      const password = generate({ length: 10, numbers: true, uppercase: true });
      this.logger.debug(`[${server.name}] setting password to ${password}...`);
      await rcon.send(setPassword(password));

      for (const slot of game.activeSlots()) {
        const player = await this.playersService.getById(slot.player);

        const playerName = deburr(player.name);
        const cmd = addGamePlayer(
          player.steamId,
          playerName,
          slot.team,
          slot.gameClass,
        );
        this.logger.debug(`[${server.name}] ${cmd}`);
        await rcon.send(cmd);
      }

      await rcon.send(enablePlayerWhitelist());

      const tvPortValue = extractConVarValue(await rcon.send(tvPort()));
      const tvPasswordValue = extractConVarValue(await rcon.send(tvPassword()));

      this.logger.debug(`[${server.name}] server ready.`);

      const connectString = `connect ${server.address}:${server.port}; password ${password}`;
      this.logger.verbose(`[${server.name}] ${connectString}`);

      let stvConnectString = `connect ${server.address}:${tvPortValue}`;
      if (tvPasswordValue?.length > 0) {
        stvConnectString += `; password ${tvPasswordValue}`;
      }
      this.logger.verbose(`[${server.name} stv] ${stvConnectString}`);

      return {
        connectString,
        stvConnectString,
      };
    } catch (error) {
      throw new Error(
        `could not configure server ${server.name} (${error.message})`,
      );
    } finally {
      await rcon?.end();
    }
  }

  async cleanupServer(server: GameServer) {
    let rcon: Rcon;
    try {
      rcon = await this.rconFactoryService.createRcon(server);

      const logAddress = `${this.environment.logRelayAddress}:${this.environment.logRelayPort}`;
      this.logger.debug(
        `[${server.name}] removing log address ${logAddress}...`,
      );
      await rcon.send(logAddressDel(logAddress));
      await rcon.send(delAllGamePlayers());
      await rcon.send(disablePlayerWhitelist());
      this.logger.verbose(`[${server.name}] server cleaned up`);
    } catch (error) {
      throw new Error(
        `could not cleanup server ${server.name} (${error.message})`,
      );
    } finally {
      await rcon?.end();
    }
  }
}
