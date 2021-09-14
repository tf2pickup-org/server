import { PlayersModule } from '@/players/players.module';
import { QueueModule } from '@/queue/queue.module';
import { forwardRef, Global, Module } from '@nestjs/common';
import { DiscordService } from './services/discord.service';
import { QueuePromptsService } from './services/queue-prompts.service';
import { AdminNotificationsService } from './services/admin-notifications.service';
import { GamesModule } from '@/games/games.module';

@Global()
@Module({
  imports: [
    forwardRef(() => QueueModule),
    forwardRef(() => PlayersModule),
    GamesModule,
  ],
  providers: [DiscordService, QueuePromptsService, AdminNotificationsService],
  exports: [DiscordService],
})
export class DiscordModule {}
