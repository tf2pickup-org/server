import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { GameServerOptionWithProvider } from '@/game-servers/interfaces/game-server-option';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { GameState } from '@/games/models/game-state';
import { assertIsError } from '@/utils/assert-is-error';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { isEqual } from 'lodash';
import { Rcon } from 'rcon-client/lib';
import { delayWhen, filter, map, merge, timer } from 'rxjs';
import { CannotCleanupGameServerError } from '../errors/cannot-cleanup-game-server.error';
import {
  logAddressDel,
  delAllGamePlayers,
  disablePlayerWhitelist,
} from '../utils/rcon-commands';

@Injectable()
export class ServerCleanupService implements OnModuleInit {
  private readonly logger = new Logger(ServerCleanupService.name);

  constructor(
    private readonly environment: Environment,
    private readonly events: Events,
    private readonly gameServersService: GameServersService,
  ) {}

  onModuleInit() {
    // the gameserver gets unassigned
    const unassigned = this.events.gameChanges.pipe(
      filter(({ oldGame }) => Boolean(oldGame.gameServer)),
      filter(
        ({ newGame, oldGame }) =>
          !isEqual(oldGame.gameServer, newGame.gameServer),
      ),
      map(({ oldGame }) => oldGame.gameServer),
    );

    // a game ends
    const gameEnds = this.events.gameChanges.pipe(
      filter(
        ({ newGame, oldGame }) =>
          oldGame.isInProgress() && !newGame.isInProgress(),
      ),
      map(({ newGame }) => newGame),
      filter((game) => Boolean(game.gameServer)),
      delayWhen((game) => {
        switch (game.state) {
          case GameState.ended:
            return timer(30 * 1000); // 30 seconds
          case GameState.interrupted:
          default:
            return timer(1); // instant
        }
      }),
      map((game) => game.gameServer),
    );

    merge(unassigned, gameEnds).subscribe(async (gameServer) => {
      try {
        await this.cleanupServer(gameServer!);
      } catch (error) {
        this.logger.error(error);
      }
    });
  }

  async cleanupServer(gameServer: GameServerOptionWithProvider) {
    const controls = await this.gameServersService.getControls(gameServer);
    let rcon: Rcon | undefined;
    try {
      rcon = await controls.rcon();

      const logAddress = `${this.environment.logRelayAddress}:${this.environment.logRelayPort}`;
      this.logger.debug(
        `[${gameServer.name}] removing log address ${logAddress}...`,
      );
      await rcon.send(logAddressDel(logAddress));
      await rcon.send(delAllGamePlayers());
      await rcon.send(disablePlayerWhitelist());
      this.logger.verbose(`[${gameServer.name}] server cleaned up`);
    } catch (error) {
      assertIsError(error);
      throw new CannotCleanupGameServerError(gameServer, error.message);
    } finally {
      await rcon?.end();
    }
  }
}
