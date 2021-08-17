import { Module, forwardRef, CacheModule } from '@nestjs/common';
import { PlayersService } from './services/players.service';
import { Etf2lProfileService } from './services/etf2l-profile.service';
import { Player, playerSchema } from './models/player';
import { PlayerBansService } from './services/player-bans.service';
import { PlayerBan, playerBanSchema } from './models/player-ban';
import { PlayerSkillService } from './services/player-skill.service';
import { PlayerSkill, playerSkillSchema } from './models/player-skill';
import { PlayersController } from './controllers/players.controller';
import { GamesModule } from '@/games/games.module';
import { OnlinePlayersService } from './services/online-players.service';
import { PlayersGateway } from './gateways/players.gateway';
import { HallOfFameController } from './controllers/hall-of-fame.controller';
import { SteamApiService } from './services/steam-api.service';
import { QueueModule } from '@/queue/queue.module';
import { FuturePlayerSkillService } from './services/future-player-skill.service';
import {
  FuturePlayerSkill,
  futurePlayerSkillSchema,
} from './models/future-player-skill';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { LinkedProfilesService } from './services/linked-profiles.service';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Player.name, schema: playerSchema },
      { name: PlayerBan.name, schema: playerBanSchema },
      { name: PlayerSkill.name, schema: playerSkillSchema },
      { name: FuturePlayerSkill.name, schema: futurePlayerSkillSchema },
    ]),
    CacheModule.register(),

    forwardRef(() => GamesModule),
    forwardRef(() => QueueModule),
    ConfigurationModule,
  ],
  providers: [
    PlayersService,
    Etf2lProfileService,
    PlayerBansService,
    PlayerSkillService,
    OnlinePlayersService,
    PlayersGateway,
    SteamApiService,
    FuturePlayerSkillService,
    LinkedProfilesService,
  ],
  exports: [
    PlayersService,
    PlayerBansService,
    PlayerSkillService,
    OnlinePlayersService,
    LinkedProfilesService,
  ],
  controllers: [PlayersController, HallOfFameController],
})
export class PlayersModule {}
