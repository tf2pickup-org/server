import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { LogsTfApiService } from './services/logs-tf-api.service';
import { LogCollectorService } from './services/log-collector.service';
import { GamesModule } from '@/games/games.module';
import { LogReceiverModule } from '@/log-receiver/log-receiver.module';

@Module({
  imports: [HttpModule, GamesModule, LogReceiverModule],
  providers: [LogsTfApiService, LogCollectorService],
})
export class LogsTfModule {}
