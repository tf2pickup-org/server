import { Injectable, Logger } from '@nestjs/common';
import { GameRunnerFactoryService } from './game-runner-factory.service';
import { GameRunner } from '../game-runner';

@Injectable()
export class GameRunnerManagerService {

  runners: GameRunner[] = [];
  private logger = new Logger(GameRunnerManagerService.name);
  private runnersByEventSource = new Map<string, GameRunner>();

  constructor(
    private gameRunnerFactoryService: GameRunnerFactoryService,
  ) { }

  createGameRunner(gameId: string): GameRunner {
    const gameRunner = this.gameRunnerFactoryService.createGameRunner(gameId);
    this.runners.push(gameRunner);

    gameRunner.gameInitialized.subscribe(() => {
      const gameServer = gameRunner.gameServer;
      gameServer.resolvedIpAddresses.forEach(address => {
        const eventSource = `${address}:${gameServer.port}`;
        if (this.runnersByEventSource.has(eventSource)) {
          this.logger.error(`event source ${eventSource} for game #${gameRunner.game.number} `
            + `running on server ${gameServer.name} already registered`);
        }

        this.runnersByEventSource.set(eventSource, gameRunner);
        this.logger.debug(`registered ${eventSource} as event source for game #${gameRunner.game.number}`);
      });
    });

    gameRunner.gameFinished.subscribe(() => {
      // unregister the game runner once it's done running the game
      this.runnersByEventSource.forEach((aGameRunner, eventSource) => {
        if (aGameRunner === gameRunner) {
          this.logger.debug(`unregistering ${eventSource} as event source for game #${gameRunner.game.number}`);
          this.runnersByEventSource.delete(eventSource);
        }
      });

      this.runners = this.runners.filter(aRunner => aRunner !== gameRunner);
    });

    return gameRunner;
  }

  findGameRunnerByEventSource(eventSource: string) {
    return this.runnersByEventSource.get(eventSource);
  }

  findGameRunnerByGameId(gameId: string) {
    return this.runners.find(runner => runner.gameId === gameId);
  }

}
