import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { GameRunner } from '../game-runner';
import { ServerConfiguratorService } from './server-configurator.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { GamesService } from './games.service';
import { ConfigService } from '@/config/config.service';
import { PlayersService } from '@/players/services/players.service';

@Injectable()
export class GameRunnerFactoryService {

  constructor(
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    private gameServersService: GameServersService,
    private configService: ConfigService,
    private serverConfiguratorService: ServerConfiguratorService,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
  ) { }

  createGameRunner(gameId: string): GameRunner {
    return new GameRunner(
      gameId,
      this.gamesService,
      this.gameServersService,
      this.configService,
      this.serverConfiguratorService,
      this.playersService,
    );
  }

}
