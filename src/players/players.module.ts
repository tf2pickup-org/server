import { Module, HttpModule } from '@nestjs/common';
import { PlayersService } from './services/players.service';
import { ConfigModule } from 'src/config/config.module';
import { Etf2lProfileService } from './etf2l-profile.service';
import { TypegooseModule } from 'nestjs-typegoose';
import { Player } from './models/player';
import { PlayerBansService } from './services/player-bans.service';
import { PlayerBan } from './models/player-ban';
import { PlayerSkillService } from './services/player-skill.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypegooseModule.forFeature([ Player, PlayerBan ]),
  ],
  providers: [
    PlayersService,
    Etf2lProfileService,
    PlayerBansService,
    PlayerSkillService,
  ],
  exports: [
    PlayersService,
    PlayerBansService,
    PlayerSkillService,
  ],
})
export class PlayersModule { }
