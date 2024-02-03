import { Module } from '@nestjs/common';
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
import { HttpModule } from '@nestjs/axios';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { TwitchTvConfigurationService } from './services/twitch-tv-configuration.service';
import { TwitchTvApiService } from './services/twitch-tv-api.service';

@Module({
  imports: [
    HttpModule,
    PlayersModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: TwitchTvProfile.name, schema: twitchTvProfileSchema },
    ]),
    ConfigurationModule,
  ],
  providers: [
    TwitchService,
    TwitchAuthService,
    TwitchGateway,
    TwitchTvConfigurationService,
    TwitchTvApiService,
  ],
  exports: [TwitchService],
  controllers: [TwitchController],
})
export class TwitchModule {}
