import { Module, forwardRef } from '@nestjs/common';
import { DiscordNotificationsService } from './services/discord-notifications.service';
import { PlayersModule } from '@/players/players.module';
import { MessageEmbedFactoryService } from './services/message-embed-factory.service';
import { DiscordService } from './services/discord.service';

@Module({
  imports: [
    forwardRef(() => PlayersModule),
  ],
  providers: [
    DiscordNotificationsService,
    MessageEmbedFactoryService,
    DiscordService,
  ],
  exports: [
    DiscordNotificationsService,
    MessageEmbedFactoryService,
  ],
})
export class DiscordModule { }
