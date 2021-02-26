import { PlayersModule } from '@/players/players.module';
import { QueueModule } from '@/queue/queue.module';
import { Module } from '@nestjs/common';
import { DiscordService } from './services/discord.service';
import { QueuePromptsService } from './services/queue-prompts.service';
import { AdminNotificationsService } from './services/admin-notifications.service';

@Module({
  imports: [
    QueueModule,
    PlayersModule,
  ],
  providers: [
    DiscordService,
    QueuePromptsService,
    AdminNotificationsService,
  ],
  exports: [
    DiscordService,
  ],
})
export class DiscordModule { }
