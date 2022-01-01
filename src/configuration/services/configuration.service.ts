import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { instanceToPlain, plainToInstance } from 'class-transformer';
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
    return plainToInstance(
      DefaultPlayerSkill,
      await this.get(
        ConfigurationEntryKey.defaultPlayerSkill,
        instanceToPlain(new DefaultPlayerSkill()),
      ),
    );
  }

  async getWhitelistId(): Promise<WhitelistId> {
    return plainToInstance(
      WhitelistId,
      await this.get(ConfigurationEntryKey.whitelistId, new WhitelistId()),
    );
  }

  async isEtf2lAccountRequired(): Promise<Etf2lAccountRequired> {
    return plainToInstance(
      Etf2lAccountRequired,
      await this.get(
        ConfigurationEntryKey.etf2lAccountRequired,
        new Etf2lAccountRequired(),
      ),
    );
  }

  async getMinimumTf2InGameHours(): Promise<MinimumTf2InGameHours> {
    return plainToInstance(
      MinimumTf2InGameHours,
      await this.get(
        ConfigurationEntryKey.minimumTf2InGameHours,
        new MinimumTf2InGameHours(),
      ),
    );
  }

  async getVoiceServer(): Promise<VoiceServer> {
    return plainToInstance(
      VoiceServer,
      await this.get(
        ConfigurationEntryKey.voiceServer,
        instanceToPlain(new VoiceServer()),
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
