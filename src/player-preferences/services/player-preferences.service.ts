import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PlayerPreferences,
  PlayerPreferencesDocument,
} from '../models/player-preferences';

export type PreferencesType = Map<string, string>;

@Injectable()
export class PlayerPreferencesService {
  constructor(
    @InjectModel(PlayerPreferences.name)
    private playerPreferences: Model<PlayerPreferencesDocument>,
  ) {}

  async getPlayerPreferences(playerId: string): Promise<PreferencesType> {
    return (
      (await this.playerPreferences.findOne({ player: playerId }))
        ?.preferences ?? new Map()
    );
  }

  async updatePlayerPreferences(
    playerId: string,
    preferences: PreferencesType,
  ): Promise<PreferencesType> {
    const ret = await this.playerPreferences.findOneAndUpdate(
      { player: playerId },
      { preferences },
      { new: true, upsert: true },
    );
    return ret.preferences;
  }
}
