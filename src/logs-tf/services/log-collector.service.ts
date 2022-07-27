import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { GamesService } from '@/games/services/games.service';
import { LogReceiverService } from '@/log-receiver/services/log-receiver.service';
import { LogMessage } from '@/log-receiver/types/log-message';
import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Mutex } from 'async-mutex';
import { Cache } from 'cache-manager';
import { LogsTfApiService } from './logs-tf-api.service';

const cacheKeyForGameId = (gameId: string) => `logs/${gameId}`;

@Injectable()
export class LogCollectorService implements OnModuleInit {
  private mutex = new Mutex();

  constructor(
    private readonly logReceiverService: LogReceiverService,
    private readonly gamesService: GamesService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly events: Events,
    private readonly logsTfApiService: LogsTfApiService,
    private readonly environment: Environment,
  ) {}

  onModuleInit() {
    this.logReceiverService.data.subscribe(
      async (logMessage) => await this.processLogMessage(logMessage),
    );
    this.events.matchEnded.subscribe(
      async ({ gameId }) => await this.uploadLogs(gameId),
    );
  }

  async processLogMessage(logMessage: LogMessage) {
    try {
      const game = await this.gamesService.getByLogSecret(logMessage.password);
      const key = cacheKeyForGameId(game.id);

      await this.mutex.runExclusive(async () => {
        const logFile = (await this.cache.get<string>(key)) ?? '';
        await this.cache.set(key, `${logFile}\n${logMessage.payload}`, {
          ttl: 0,
        });
      });

      // eslint-disable-next-line no-empty
    } catch (error) {}
  }

  async uploadLogs(gameId: string) {
    const key = cacheKeyForGameId(gameId);
    const logFile = await this.cache.get<string>(key);
    const game = await this.gamesService.getById(gameId);
    const logsUrl = await this.logsTfApiService.uploadLogs(
      game.map,
      `${this.environment.websiteName} #${game.number}`,
      logFile,
    );
    await this.cache.del(key);
    this.events.logsUploaded.next({ gameId, logsUrl });
  }
}
