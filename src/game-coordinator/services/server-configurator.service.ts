import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Environment } from '@/environment/environment';
import { PlayersService } from '@/players/services/players.service';
import {
  logAddressAdd,
  changelevel,
  execConfig,
  setPassword,
  addGamePlayer,
  kickAll,
  enablePlayerWhitelist,
  tvPort,
  tvPassword,
  tftrueWhitelistId,
  logsTfTitle,
  logsTfAutoupload,
} from '../utils/rcon-commands';
import { deburr, isEqual } from 'lodash';
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
import { Events } from '@/events/events';
import { filter, map } from 'rxjs';
import { CannotConfigureGameError } from '../errors/cannot-configure-game.error';
import { assertIsError } from '@/utils/assert-is-error';
import { LogsTfUploadMethod } from '@/games/logs-tf-upload-method';
import { GameState } from '@/games/models/game-state';
import { GameId } from '@/games/game-id';
import { GameEventType } from '@/games/models/game-event-type';

@Injectable()
export class ServerConfiguratorService implements OnModuleInit {
  private logger = new Logger(ServerConfiguratorService.name);

  constructor(
    private environment: Environment,
    private playersService: PlayersService,
    private mapPoolService: MapPoolService,
    private configurationService: ConfigurationService,
    private gamesService: GamesService,
    private gameServersService: GameServersService,
    private gameConfigsService: GameConfigsService,
    private events: Events,
  ) {}

  onModuleInit() {
    // when a gameserver is assigned to a game, we can configure the gameserver
    this.events.gameChanges
      .pipe(
        filter(({ newGame }) => Boolean(newGame.gameServer)),
        filter(
          ({ oldGame, newGame }) =>
            !isEqual(oldGame.gameServer, newGame.gameServer),
        ),
        map(({ newGame }) => newGame._id),
      )
      .subscribe(async (gameId) => {
        try {
          await this.configureServer(gameId);
        } catch (error) {
          this.logger.error(error);
        }
      });
  }

  async configureServer(gameId: GameId) {
    let game = await this.gamesService.getById(gameId);
    if (!game.gameServer) {
      throw new GameServerNotAssignedError(game.id);
    }

    const controls = await this.gameServersService.getControls(game.gameServer);

    this.logger.verbose(`starting gameserver ${game.gameServer.name}`);
    await controls.start();

    this.logger.verbose(`configuring server ${game.gameServer.name}...`);

    const password = generateGameserverPassword();
    const configLines: string[] = [
      logAddressAdd(
        `${this.environment.logRelayAddress}:${this.environment.logRelayPort}`,
      ),
    ]
      .concat(kickAll())
      .concat(changelevel(game.map))
      .concat(this.gameConfigsService.compileConfig())
      .concat(
        await (async () => {
          // execute config for the selected map
          const maps = await this.mapPoolService.getMaps();
          const config = maps.find((m) => m.name === game.map)?.execConfig;
          return config ? execConfig(config) : '';
        })(),
      )
      .concat(
        await (async () => {
          const whitelistId = await this.configurationService.get<
            string | undefined
          >('games.whitelist_id');
          return whitelistId ? tftrueWhitelistId(whitelistId) : '';
        })(),
      )
      .concat(setPassword(password))
      .concat(
        await Promise.all(
          game.activeSlots().map(async (slot) => {
            const player = await this.playersService.getById(slot.player);
            return addGamePlayer(
              player.steamId,
              deburr(player.name),
              slot.team,
              slot.gameClass,
            );
          }),
        ),
      )
      .concat(enablePlayerWhitelist())
      .concat(logsTfTitle(`${this.environment.websiteName} #${game.number}`))
      .concat(
        (await this.configurationService.get<LogsTfUploadMethod>(
          'games.logs_tf_upload_method',
        )) === LogsTfUploadMethod.Gameserver
          ? logsTfAutoupload(2)
          : logsTfAutoupload(0),
      )
      .concat(
        await this.configurationService.get<string[]>(
          'games.execute_extra_commands',
        ),
      )
      .filter((line) => Boolean(line));

    let rcon: Rcon | undefined;
    try {
      rcon = await controls.rcon();

      // reset connect info
      game = await this.gamesService.update(game._id, {
        $set: {
          state: GameState.configuring,
        },
        $unset: {
          connectString: 1,
          stvConnectString: 1,
        },
        $inc: {
          connectInfoVersion: 1,
        },
      });

      const logSecret = await controls.getLogsecret();
      game = await this.gamesService.update(game._id, { logSecret });
      if (!game.gameServer) {
        throw new GameServerNotAssignedError(game.id);
      }

      this.logger.debug(
        `[${game.gameServer.name}] logsecret is ${game.logSecret}`,
      );

      for (const line of configLines) {
        this.logger.debug(`[${game.gameServer.name}] ${line}`);
        await rcon.send(line);
        if (/^changelevel|exec/.test(line)) {
          await waitABit(1000 * 10);
        }

        // changelevel might sometimes kick us
        if (!rcon.authenticated) {
          await rcon.connect();
        }
      }

      this.logger.debug(`[${game.gameServer.name}] server ready.`);

      const connectString = makeConnectString({
        address: game.gameServer.address,
        port: game.gameServer.port,
        password,
      });
      this.logger.verbose(`[${game.gameServer.name}] ${connectString}`);

      const stvConnectString = makeConnectString({
        address: game.gameServer.address,
        port: extractConVarValue(await rcon.send(tvPort())) ?? 27020,
        password: extractConVarValue(await rcon.send(tvPassword())),
      });
      this.logger.verbose(`[${game.gameServer.name} stv] ${stvConnectString}`);

      game = await this.gamesService.update(game._id, {
        $set: {
          connectString,
          stvConnectString,
          state: GameState.launching,
        },
        $inc: {
          connectInfoVersion: 1,
        },
        $push: {
          events: {
            event: GameEventType.gameServerInitialized,
          },
        },
      });

      this.logger.log(`game #${game.number} configured`);

      return {
        connectString,
        stvConnectString,
      };
    } catch (error) {
      assertIsError(error);
      throw new CannotConfigureGameError(game, error.message);
    } finally {
      await rcon?.end();
    }
  }
}
