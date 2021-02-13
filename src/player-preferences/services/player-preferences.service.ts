import { Injectable } from '@nestjs/common';
import { ReturnModelType } from '@typegoose/typegoose';
import { InjectModel } from 'nestjs-typegoose';
import { PlayerPreferences } from '../models/player-preferences';

type PreferencesType = Map<string, string>;

@Injectable()
export class PlayerPreferencesService {

  constructor(
    @InjectModel(PlayerPreferences) private playerPreferences: ReturnModelType<typeof PlayerPreferences>,
  ) { }

  async getPlayerPreferences(playerId: string): Promise<PreferencesType> {
    return (await this.playerPreferences.findOne({ player: playerId }))?.preferences ?? new Map();
  }

  async updatePlayerPreferences(playerId: string, preferences: PreferencesType): Promise<PreferencesType> {
    const ret = await this.playerPreferences.findOneAndUpdate({ player: playerId }, { preferences }, { new: true, upsert: true });
    return ret.preferences;
  }

}
