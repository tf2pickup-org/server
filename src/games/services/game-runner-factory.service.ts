import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { GameRunner } from '../game-runner';
import { ServerConfiguratorService } from './server-configurator.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { Environment } from '@/environment/environment';
import { RconFactoryService } from './rcon-factory.service';

@Injectable()
export class GameRunnerFactoryService {

  constructor(
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    private gameServersService: GameServersService,
    private environment: Environment,
    private serverConfiguratorService: ServerConfiguratorService,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private rconFactoryService: RconFactoryService,
  ) { }

  createGameRunner(gameId: string): GameRunner {
    return new GameRunner(
      gameId,
      this.gamesService,
      this.gameServersService,
      this.environment,
      this.serverConfiguratorService,
      this.playersService,
      this.rconFactoryService,
    );
  }

}
