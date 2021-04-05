import { Module, HttpModule, forwardRef, CacheModule } from '@nestjs/common';
import { PlayersService } from './services/players.service';
import { Etf2lProfileService } from './services/etf2l-profile.service';
import { TypegooseModule } from 'nestjs-typegoose';
import { Player } from './models/player';
import { PlayerBansService } from './services/player-bans.service';
import { PlayerBan } from './models/player-ban';
import { PlayerSkillService } from './services/player-skill.service';
import { PlayerSkill } from './models/player-skill';
import { PlayersController } from './controllers/players.controller';
import { standardSchemaOptions } from '@/utils/standard-schema-options';
import { GamesModule } from '@/games/games.module';
import { OnlinePlayersService } from './services/online-players.service';
import { PlayersGateway } from './gateways/players.gateway';
import { HallOfFameController } from './controllers/hall-of-fame.controller';
import { SteamApiService } from './services/steam-api.service';
import { QueueModule } from '@/queue/queue.module';
import { FuturePlayerSkillService } from './services/future-player-skill.service';
import { FuturePlayerSkill } from './models/future-player-skill';
import { ConfigurationModule } from '@/configuration/configuration.module';

@Module({
  imports: [
    HttpModule,
    TypegooseModule.forFeature([
      Player,
      PlayerBan,
      standardSchemaOptions(PlayerSkill),
      standardSchemaOptions(FuturePlayerSkill),
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
  ],
  exports: [
    PlayersService,
    PlayerBansService,
    PlayerSkillService,
    OnlinePlayersService,
  ],
  controllers: [PlayersController, HallOfFameController],
})
export class PlayersModule {}
