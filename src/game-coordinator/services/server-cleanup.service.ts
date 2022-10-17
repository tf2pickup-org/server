import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { GameServerOptionWithProvider } from '@/game-servers/interfaces/game-server-option';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { GameState } from '@/games/models/game-state';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Rcon } from 'rcon-client/lib';
import { delayWhen, filter, map, timer } from 'rxjs';
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
    // cleanup the gameserver when it gets unassigned
    this.events.gameChanges
      .pipe(
        filter(({ oldGame }) => !!oldGame.gameServer),
        filter(
          ({ newGame, oldGame }) =>
            JSON.stringify(oldGame.gameServer) !==
            JSON.stringify(newGame.gameServer),
        ),
        map(({ oldGame }) => oldGame.gameServer),
      )
      .subscribe(async (gameServer) => await this.cleanupServer(gameServer));

    // cleanup the gameserver when the game ends
    this.events.gameChanges
      .pipe(
        filter(
          ({ newGame, oldGame }) =>
            oldGame.isInProgress() && !newGame.isInProgress(),
        ),
        filter(({ newGame }) => !!newGame.gameServer),
        delayWhen(({ newGame }) => {
          switch (newGame.state) {
            case GameState.ended:
              return timer(30 * 1000); // 30 seconds
            case GameState.interrupted:
              return timer(1); // instant
          }
        }),
        map(({ newGame }) => newGame.gameServer),
      )
      .subscribe(async (gameServer) => await this.cleanupServer(gameServer));
  }

  async cleanupServer(gameServer: GameServerOptionWithProvider) {
    const controls = await this.gameServersService.getControls(gameServer);
    let rcon: Rcon;
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
      this.logger.error(
        `could not cleanup server ${gameServer.name} (${error.message})`,
      );
    } finally {
      await rcon?.end();
    }
  }
}
