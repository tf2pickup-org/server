import { Module, HttpModule } from '@nestjs/common';
import { PlayersModule } from '@/players/players.module';
import { TwitchService } from './services/twitch.service';
import { TwitchController } from './controllers/twitch.controller';
import { TwitchAuthService } from './services/twitch-auth.service';

@Module({
  imports: [
    HttpModule,

    PlayersModule,
  ],
  providers: [
    TwitchService,
    TwitchAuthService,
  ],
  exports: [
    TwitchService,
  ],
  controllers: [
    TwitchController,
  ],
})
export class TwitchModule { }
