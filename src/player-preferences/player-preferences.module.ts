import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { PlayerPreferences } from './models/player-preferences';
import { PlayerPreferencesService } from './services/player-preferences.service';

@Module({
  imports: [
    TypegooseModule.forFeature([ PlayerPreferences ]),
  ],
  providers: [
    PlayerPreferencesService,
  ],
})
export class PlayerPreferencesModule {}
