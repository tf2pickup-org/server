import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Events } from '@/events/events';
import { GameId } from '@/games/game-id';
import { LogsTfUploadMethod } from '@/games/logs-tf-upload-method';
import { GamesService } from '@/games/services/games.service';
import { LogReceiverService } from '@/log-receiver/services/log-receiver.service';
import { LogMessage } from '@/log-receiver/types/log-message';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { concatMap, from, map, merge } from 'rxjs';
import { LogsTfApiService } from './logs-tf-api.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameLogs, GameLogsDocument } from '../models/game-logs';

@Injectable()
export class LogCollectorService implements OnModuleInit {
  private readonly logger = new Logger(LogCollectorService.name);

  constructor(
    private readonly logReceiverService: LogReceiverService,
    private readonly gamesService: GamesService,
    private readonly events: Events,
    private readonly logsTfApiService: LogsTfApiService,
    private readonly configurationService: ConfigurationService,
    @InjectModel(GameLogs.name)
    private readonly gameLogsModel: Model<GameLogsDocument>,
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
    this.logger.log(`uploading logs for game #${game.number}...`);

    try {
      const gameLogs = await this.gameLogsModel
        .findOne({
          logSecret: game.logSecret,
        })
        .orFail()
        .exec();

      const logFile = gameLogs.logs.map((line) => `L ${line}`).join('\n');
      const logsUrl = await this.logsTfApiService.uploadLogs({
        mapName: game.map,
        gameNumber: game.number,
        logFile,
      });
      this.logger.log(`game #${game.number} logs URL: ${logsUrl}`);
      this.events.logsUploaded.next({ gameId, logsUrl });
    } catch (error) {
      this.logger.error(
        `uploading logs for game #${game.number} failed: ${error}`,
      );
    }
  }
}
