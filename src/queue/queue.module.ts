import { Module } from '@nestjs/common';
import { QueueService } from './services/queue.service';
import { QueueConfigService } from './services/queue-config.service';
import { ConfigModule } from '@/config/config.module';
import { PlayersModule } from '@/players/players.module';

@Module({
  imports: [
    ConfigModule,
    PlayersModule,
  ],
  providers: [
    QueueService,
    QueueConfigService,
  ],
})
export class QueueModule { }
