import { PlayersModule } from '@/players/players.module';
import { QueueModule } from '@/queue/queue.module';
import { forwardRef, Module } from '@nestjs/common';
import { DiscordService } from './services/discord.service';
import { QueuePromptsService } from './services/queue-prompts.service';

@Module({
  imports: [
    QueueModule,
    forwardRef(() => PlayersModule),
  ],
  providers: [
    DiscordService,
    QueuePromptsService,
  ],
  exports: [
    DiscordService,
  ],
})
export class DiscordModule { }
