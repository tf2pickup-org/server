import { Module, forwardRef } from '@nestjs/common';
import { DiscordNotificationsService } from './services/discord-notifications.service';
import { PlayersModule } from '@/players/players.module';
import { ConfigModule } from '@nestjs/config';

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
