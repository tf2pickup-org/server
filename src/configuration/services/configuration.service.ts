import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { classToPlain, plainToClass } from 'class-transformer';
import { Model } from 'mongoose';
import {
  ConfigurationEntry,
  ConfigurationEntryDocument,
} from '../models/configuration-entry';
import { ConfigurationEntryKey } from '../models/configuration-entry-key';
import { DefaultPlayerSkill } from '../models/default-player-skill';
import { Etf2lAccountRequired } from '../models/etf2l-account-required';
import { MinimumTf2InGameHours } from '../models/minimum-tf2-in-game-hours';
import { VoiceServer } from '../models/voice-server';
import { WhitelistId } from '../models/whitelist-id';

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectModel(ConfigurationEntry.name)
    private configurationEntryModel: Model<ConfigurationEntryDocument>,
  ) {}

  async getDefaultPlayerSkill(): Promise<DefaultPlayerSkill> {
    return plainToClass(
      DefaultPlayerSkill,
      await this.get(
        ConfigurationEntryKey.defaultPlayerSkill,
        classToPlain(new DefaultPlayerSkill()),
      ),
    );
  }

  async getWhitelistId(): Promise<WhitelistId> {
    return plainToClass(
      WhitelistId,
      await this.get(ConfigurationEntryKey.whitelistId, new WhitelistId()),
    );
  }

  async isEtf2lAccountRequired(): Promise<Etf2lAccountRequired> {
    return plainToClass(
      Etf2lAccountRequired,
      await this.get(
        ConfigurationEntryKey.etf2lAccountRequired,
        new Etf2lAccountRequired(),
      ),
    );
  }

  async getMinimumTf2InGameHours(): Promise<MinimumTf2InGameHours> {
    return plainToClass(
      MinimumTf2InGameHours,
      await this.get(
        ConfigurationEntryKey.minimumTf2InGameHours,
        new MinimumTf2InGameHours(),
      ),
    );
  }

  async getVoiceServer(): Promise<VoiceServer> {
    return plainToClass(
      VoiceServer,
      await this.get(
        ConfigurationEntryKey.voiceServer,
        classToPlain(new VoiceServer()),
      ),
    );
  }

  private async get(key: ConfigurationEntryKey, defaultValue: any) {
    try {
      return await this.configurationEntryModel
        .findOne({ key })
        .orFail()
        .lean()
        .exec();
    } catch (error) {
      return defaultValue;
    }
  }

  async set(entry: ConfigurationEntry) {
    await this.configurationEntryModel.updateOne({ key: entry.key }, entry, {
      upsert: true,
    });
  }
}
