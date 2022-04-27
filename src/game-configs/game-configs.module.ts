import { QueueModule } from '@/queue/queue.module';
import { Module } from '@nestjs/common';
import { GameConfigsService } from './services/game-configs.service';

@Module({
  imports: [QueueModule],
  providers: [GameConfigsService],
})
export class GameConfigsModule {}
