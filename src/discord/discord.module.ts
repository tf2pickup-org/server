import { Module, forwardRef } from '@nestjs/common';
import { DiscordNotificationsService } from './services/discord-notifications.service';
import { ConfigModule } from '@/config/config.module';
import { PlayersModule } from '@/players/players.module';

@Module({
  imports: [
    ConfigModule,
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
