import { Events } from '@/events/events';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DenyPlayersWithNoSkillAssigned } from '../models/deny-players-with-no-skill-assigned';
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
import { TimeToJoinGameServer } from '../models/time-to-join-game-server';

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectModel(ConfigurationEntry.name)
    private configurationEntryModel: Model<ConfigurationEntryDocument>,
    private events: Events,
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

  async getDenyPlayersWithNoSkillAssigned(): Promise<DenyPlayersWithNoSkillAssigned> {
    return plainToInstance(
      DenyPlayersWithNoSkillAssigned,
      await this.get(
        ConfigurationEntryKey.denyPlayersWithNoSkillAssigned,
        new DenyPlayersWithNoSkillAssigned(),
      ),
    );
  }

  async getTimeToJoinGameServer(): Promise<TimeToJoinGameServer> {
    return plainToInstance(
      TimeToJoinGameServer,
      await this.get(
        ConfigurationEntryKey.timeToJoinGameServer,
        new TimeToJoinGameServer(),
      ),
    );
  }

  private async get<T>(key: ConfigurationEntryKey, defaultValue: T) {
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
    this.events.configurationEntryChanged.next({ entryKey: entry.key });
  }
}
