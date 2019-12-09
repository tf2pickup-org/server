import { Module, HttpModule } from '@nestjs/common';
import { PlayersService } from './players.service';
import { ConfigModule } from 'src/config/config.module';
import { Etf2lProfileService } from './etf2l-profile.service';
import { TypegooseModule } from 'nestjs-typegoose';
import { Player } from './models/player';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypegooseModule.forFeature([
      Player,
    ]),
  ],
  providers: [
    PlayersService,
    Etf2lProfileService,
  ],
  exports: [
    PlayersService,
  ],
})
export class PlayersModule { }
