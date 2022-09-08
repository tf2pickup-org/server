import { Injectable, Logger } from '@nestjs/common';
import { Environment } from '@/environment/environment';
import { PlayersService } from '@/players/services/players.service';
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
  logsTfTitle,
} from '../utils/rcon-commands';
import { deburr } from 'lodash';
import { extractConVarValue } from '../utils/extract-con-var-value';
import { Rcon } from 'rcon-client/lib';
import { MapPoolService } from '@/queue/services/map-pool.service';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { waitABit } from '@/utils/wait-a-bit';
import { GameConfigsService } from '@/game-configs/services/game-configs.service';
import { GamesService } from '@/games/services/games.service';
import { GameServerNotAssignedError } from '../errors/game-server-not-assigned.error';
import { generateGameserverPassword } from '@/utils/generate-gameserver-password';
import { makeConnectString } from '../utils/make-connect-string';

@Injectable()
export class ServerConfiguratorService {
  private logger = new Logger(ServerConfiguratorService.name);

  constructor(
    private environment: Environment,
    private playersService: PlayersService,
    private mapPoolService: MapPoolService,
    private configurationService: ConfigurationService,
    private gamesService: GamesService,
    private gameServersService: GameServersService,
    private gameConfigsService: GameConfigsService,
  ) {}

  async configureServer(gameId: string) {
    let game = await this.gamesService.getById(gameId);
    if (!game.gameServer) {
      throw new GameServerNotAssignedError(game.id);
    }

    const controls = await this.gameServersService.getControls(game.gameServer);
    const configLines = await this.gameConfigsService.compileConfig();

    this.logger.verbose(`starting gameserver ${game.gameServer.name}`);
    await controls.start();

    this.logger.verbose(`configuring server ${game.gameServer.name}...`);

    let rcon: Rcon;
    try {
      rcon = await controls.rcon();

      const logSecret = await controls.getLogsecret();
      game = await this.gamesService.update(game.id, { logSecret });
      this.logger.debug(
        `[${game.gameServer.name}] logsecret is ${game.logSecret}`,
      );

      const logAddress = `${this.environment.logRelayAddress}:${this.environment.logRelayPort}`;
      this.logger.debug(
        `[${game.gameServer.name}] adding log address ${logAddress}...`,
      );
      await rcon.send(logAddressAdd(logAddress));

      this.logger.debug(`[${game.gameServer.name}] kicking all players...`);
      await rcon.send(kickAll());
      this.logger.debug(
        `[${game.gameServer.name}] changing map to ${game.map}...`,
      );
      await rcon.send(changelevel(game.map));

      // source servers need a moment after the map has been changed
      await waitABit(1000 * 10);

      // map change might kick us
      if (!rcon.authenticated) {
        await rcon.connect();
      }

      await Promise.all(configLines.map(async (line) => await rcon.send(line)));

      const maps = await this.mapPoolService.getMaps();
      const config = maps.find((m) => m.name === game.map)?.execConfig;
      if (config) {
        this.logger.debug(`[${game.gameServer.name}] executing ${config}...`);
        await rcon.send(execConfig(config));
        await waitABit(1000 * 10);
      }

      const whitelistId = (await this.configurationService.getWhitelistId())
        .value;
      if (whitelistId) {
        this.logger.debug(
          `[${game.gameServer.name}] setting whitelist ${whitelistId}...`,
        );
        await rcon.send(tftrueWhitelistId(whitelistId));
      }

      const password = generateGameserverPassword();
      this.logger.debug(
        `[${game.gameServer.name}] setting password to ${password}...`,
      );
      await rcon.send(setPassword(password));

      const slots = await Promise.all(
        game.activeSlots().map(async (slot) => ({
          ...slot,
          player: await this.playersService.getById(slot.player),
        })),
      );

      for (const slot of slots) {
        const cmd = addGamePlayer(
          slot.player.steamId,
          deburr(slot.player.name),
          slot.team,
          slot.gameClass,
        );
        this.logger.debug(`[${game.gameServer.name}] ${cmd}`);
        await rcon.send(cmd);
      }

      await rcon.send(enablePlayerWhitelist());
      await rcon.send(
        logsTfTitle(`${this.environment.websiteName} #${game.number}`),
      );

      this.logger.debug(`[${game.gameServer.name}] server ready.`);

      const connectString = makeConnectString({
        address: game.gameServer.address,
        port: game.gameServer.port,
        password,
      });
      this.logger.verbose(`[${game.gameServer.name}] ${connectString}`);

      const stvConnectString = makeConnectString({
        address: game.gameServer.address,
        port: extractConVarValue(await rcon.send(tvPort())),
        password: extractConVarValue(await rcon.send(tvPassword())),
      });
      this.logger.verbose(`[${game.gameServer.name} stv] ${stvConnectString}`);

      return {
        connectString,
        stvConnectString,
      };
    } catch (error) {
      throw new Error(
        `could not configure server ${game.gameServer.name} (${error.message})`,
      );
    } finally {
      await rcon?.end();
    }
  }

  async cleanupServer(gameId: string) {
    const game = await this.gamesService.getById(gameId);
    if (!game.gameServer) {
      throw new GameServerNotAssignedError(game.id);
    }

    const controls = await this.gameServersService.getControls(game.gameServer);

    let rcon: Rcon;
    try {
      rcon = await controls.rcon();

      const logAddress = `${this.environment.logRelayAddress}:${this.environment.logRelayPort}`;
      this.logger.debug(
        `[${game.gameServer.name}] removing log address ${logAddress}...`,
      );
      await rcon.send(logAddressDel(logAddress));
      await rcon.send(delAllGamePlayers());
      await rcon.send(disablePlayerWhitelist());
      this.logger.verbose(`[${game.gameServer.name}] server cleaned up`);
    } catch (error) {
      throw new Error(
        `could not cleanup server ${game.gameServer.name} (${error.message})`,
      );
    } finally {
      await rcon?.end();
    }
  }
}
