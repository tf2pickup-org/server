import { Module, HttpModule } from '@nestjs/common';
import { PlayersModule } from '@/players/players.module';
import { TwitchService } from './services/twitch.service';
import { TwitchController } from './controllers/twitch.controller';
import { TwitchAuthService } from './services/twitch-auth.service';
import { AuthModule } from '@/auth/auth.module';
import { TwitchGateway } from './gateways/twitch.gateway';
import {
  TwitchTvProfile,
  twitchTvProfileSchema,
} from './models/twitch-tv-profile';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    HttpModule,
    PlayersModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: TwitchTvProfile.name, schema: twitchTvProfileSchema },
    ]),
  ],
  providers: [TwitchService, TwitchAuthService, TwitchGateway],
  exports: [TwitchService],
  controllers: [TwitchController],
})
export class TwitchModule {}
