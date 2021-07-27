import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PlayerPreferences,
  playerPreferencesSchema,
} from './models/player-preferences';
import { PlayerPreferencesService } from './services/player-preferences.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PlayerPreferences.name,
        schema: playerPreferencesSchema,
      },
    ]),
  ],
  providers: [PlayerPreferencesService],
  exports: [PlayerPreferencesService],
})
export class PlayerPreferencesModule {}
