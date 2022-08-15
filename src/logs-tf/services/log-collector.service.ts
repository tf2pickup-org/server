import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { GamesService } from '@/games/services/games.service';
import { LogReceiverService } from '@/log-receiver/services/log-receiver.service';
import { LogMessage } from '@/log-receiver/types/log-message';
import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Mutex } from 'async-mutex';
import { Cache } from 'cache-manager';
import { concatMap, from, map, merge } from 'rxjs';
import { LogsTfApiService } from './logs-tf-api.service';

const cacheKeyForGameId = (gameId: string) => `games/${gameId}/logs`;

@Injectable()
export class LogCollectorService implements OnModuleInit {
  private readonly mutex = new Mutex();
  private readonly logger = new Logger(LogCollectorService.name);

  constructor(
    private readonly logReceiverService: LogReceiverService,
    private readonly gamesService: GamesService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly events: Events,
    private readonly logsTfApiService: LogsTfApiService,
    private readonly environment: Environment,
  ) {}

  onModuleInit() {
    // make sure log lines & match end events are processed in order
    merge(
      this.logReceiverService.data.pipe(
        map((logMessage) => () => this.processLogMessage(logMessage)),
      ),
      this.events.matchEnded.pipe(
        map(
          ({ gameId }) =>
            () =>
              this.uploadLogs(gameId),
        ),
      ),
    )
      .pipe(concatMap((handle) => from(handle())))
      .subscribe();
  }

  async processLogMessage(logMessage: LogMessage) {
    try {
      const game = await this.gamesService.getByLogSecret(logMessage.password);
      const key = cacheKeyForGameId(game.id);

      await this.mutex.runExclusive(async () => {
        let logFile = await this.cache.get<string>(key);
        if (logFile) {
          logFile += `\nL ${logMessage.payload}`;
        } else {
          logFile = `L ${logMessage.payload}`;
        }
        await this.cache.set(key, logFile, { ttl: 0 });
      });

      // eslint-disable-next-line no-empty
    } catch (error) {}
  }

  async uploadLogs(gameId: string) {
    const game = await this.gamesService.getById(gameId);
    this.logger.log(`uploading logs for game #${game.number}...`);

    try {
      const key = cacheKeyForGameId(gameId);
      const logsUrl = await this.logsTfApiService.uploadLogs({
        mapName: game.map,
        gameNumber: game.number,
        logFile: await this.cache.get<string>(key),
      });
      this.logger.log(`game #${game.number} logs URL: ${logsUrl}`);
      await this.cache.del(key);
      this.events.logsUploaded.next({ gameId, logsUrl });
    } catch (error) {
      this.logger.error(
        `uploading logs for game #${game.number} failed: ${error}`,
      );
    }
  }
}
