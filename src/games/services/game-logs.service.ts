import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Game } from '../models/game';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { LogReceiverService } from '@/log-receiver/services/log-receiver.service';
import { LogsTfApiService } from '@/logs-tf/services/logs-tf-api.service';
import { GamesService } from './games.service';
import { concatMap, from, map, merge } from 'rxjs';
import { Events } from '@/events/events';
import { LogMessage } from '@/log-receiver/types/log-message';
import { GameId } from '../types/game-id';
import { LogsTfUploadMethod } from '../types/logs-tf-upload-method';
import { assertIsError } from '@/utils/assert-is-error';
import { GameLogs } from '../models/game-logs';

@Injectable()
export class GameLogsService {
  private readonly logger = new Logger(GameLogsService.name);

  constructor(
    private readonly logReceiverService: LogReceiverService,
    private readonly gamesService: GamesService,
    private readonly events: Events,
    private readonly logsTfApiService: LogsTfApiService,
    private readonly configurationService: ConfigurationService,
    @InjectModel(GameLogs.name)
    private readonly gameLogsModel: Model<GameLogs>,
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
    await this.gameLogsModel.findOneAndUpdate(
      { logSecret: logMessage.password },
      { $push: { logs: logMessage.payload } },
      { new: true, upsert: true },
    );
  }

  async uploadLogs(gameId: GameId) {
    if (
      (await this.configurationService.get<LogsTfUploadMethod>(
        'games.logs_tf_upload_method',
      )) !== LogsTfUploadMethod.Backend
    ) {
      return;
    }

    const game = await this.gamesService.getById(gameId);
    if (!game.logSecret) {
      throw new Error(`game #${game.number} has no log secret`);
    }

    this.logger.log(`uploading logs for game #${game.number}...`);

    try {
      const logFile = await this.getLogs(game.logSecret);
      const logsUrl = await this.logsTfApiService.uploadLogs({
        mapName: game.map,
        gameNumber: game.number,
        logFile,
      });
      this.logger.log(`game #${game.number} logs URL: ${logsUrl}`);
      this.events.logsUploaded.next({ gameId, logsUrl });
    } catch (error) {
      assertIsError(error);
      this.logger.error(
        `uploading logs for game #${game.number} failed: ${error.message}`,
      );
    }
  }

  async getLogs(logSecret: NonNullable<Game['logSecret']>): Promise<string> {
    const gameLogs = await this.gameLogsModel
      .findOne({ logSecret })
      .orFail()
      .select('logs')
      .lean()
      .exec();
    return gameLogs.logs.map((line) => `L ${line}`).join('\n');
  }
}
