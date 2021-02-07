import { Module } from '@nestjs/common';
import { DiscordService } from './services/discord.service';
import { QueuePromptsService } from './services/queue-prompts.service';

@Module({
  providers: [
    DiscordService,
    QueuePromptsService,
  ],
  exports: [
    DiscordService,
  ],
})
export class DiscordModule { }
