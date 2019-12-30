import { Module, forwardRef } from '@nestjs/common';
import { DiscordNotificationsService } from './services/discord-notifications.service';
import { PlayersModule } from '@/players/players.module';

@Module({
  imports: [
    forwardRef(() => PlayersModule),
  ],
  providers: [
    DiscordNotificationsService,
  ],
  exports: [
    DiscordNotificationsService,
  ],
})
export class DiscordModule { }
