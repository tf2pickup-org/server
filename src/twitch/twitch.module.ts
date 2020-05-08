import { Module, HttpModule } from '@nestjs/common';
import { PlayersModule } from '@/players/players.module';
import { TwitchService } from './services/twitch.service';
import { TwitchController } from './controllers/twitch.controller';
import { TwitchAuthService } from './services/twitch-auth.service';
import { AuthModule } from '@/auth/auth.module';
import { TwitchGateway } from './gateways/twitch.gateway';

@Module({
  imports: [
    HttpModule,

    PlayersModule,
    AuthModule,
  ],
  providers: [
    TwitchService,
    TwitchAuthService,
    TwitchGateway,
  ],
  exports: [
    TwitchService,
  ],
  controllers: [
    TwitchController,
  ],
})
export class TwitchModule { }
