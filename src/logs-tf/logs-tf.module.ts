import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { LogsTfApiService } from './services/logs-tf-api.service';
import { LogCollectorService } from './services/log-collector.service';
import { GamesModule } from '@/games/games.module';
import { LogReceiverModule } from '@/log-receiver/log-receiver.module';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { MongooseModule } from '@nestjs/mongoose';
import { GameLogs, gameLogsSchema } from './models/game-logs';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameLogs.name, schema: gameLogsSchema },
    ]),
    HttpModule,
    GamesModule,
    LogReceiverModule,
    ConfigurationModule,
  ],
  providers: [LogsTfApiService, LogCollectorService],
})
export class LogsTfModule {}
