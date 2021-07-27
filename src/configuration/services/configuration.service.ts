import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ConfigurationEntry,
  ConfigurationEntryDocument,
} from '../models/configuration-entry';
import { ConfigurationEntryKey } from '../models/configuration-entry-key';
import { MumbleOptions } from '../models/mumble-options';

// this name wtf
const defaultDefaultPlayerSkill = new Map(
  Object.keys(Tf2ClassName).map((className) => [className, 1]),
);

type VoiceServer = MumbleOptions;

@Injectable()
export class ConfigurationService implements OnModuleInit {
  constructor(
    @InjectModel(ConfigurationEntry.name)
    private configurationEntryModel: Model<ConfigurationEntryDocument>,
  ) {}

  async onModuleInit() {
    await Promise.all([
      this.loadDefault(
        ConfigurationEntryKey.defaultPlayerSkill,
        JSON.stringify(Object.fromEntries(defaultDefaultPlayerSkill.entries())),
      ),
      this.loadDefault(ConfigurationEntryKey.whitelistId, ''),
      this.loadDefault(
        ConfigurationEntryKey.etf2lAccountRequired,
        true.toString(),
      ),
      this.loadDefault(ConfigurationEntryKey.minimumTf2InGameHours, '500'),
      this.loadDefault(
        ConfigurationEntryKey.voiceServer,
        JSON.stringify({
          type: 'mumble',
          url: 'melkor.tf',
          port: 64738,
          channelName: 'tf2pickup',
        }),
      ),
    ]);
  }

  async getDefaultPlayerSkill(): Promise<Map<Tf2ClassName, number>> {
    const value = await this.retrieve(ConfigurationEntryKey.defaultPlayerSkill);
    return new Map(Object.entries(JSON.parse(value))) as Map<
      Tf2ClassName,
      number
    >;
  }

  async setDefaultPlayerSkill(
    defaultPlayerSkill: Map<Tf2ClassName, number>,
  ): Promise<Map<Tf2ClassName, number>> {
    await this.store(
      ConfigurationEntryKey.defaultPlayerSkill,
      JSON.stringify(Object.fromEntries(defaultPlayerSkill)),
    );
    return defaultPlayerSkill;
  }

  async getWhitelistId(): Promise<string> {
    return await this.retrieve(ConfigurationEntryKey.whitelistId);
  }

  async setWhitelistId(whitelistId: string): Promise<string> {
    await this.store(ConfigurationEntryKey.whitelistId, whitelistId);
    return whitelistId;
  }

  async isEtf2lAccountRequired(): Promise<boolean> {
    return (
      (await this.retrieve(ConfigurationEntryKey.etf2lAccountRequired)) ===
      'true'
    );
  }

  async setEtf2lAccountRequired(
    etf2lAccountRequired: boolean,
  ): Promise<boolean> {
    await this.store(
      ConfigurationEntryKey.etf2lAccountRequired,
      etf2lAccountRequired.toString(),
    );
    return etf2lAccountRequired;
  }

  async getMinimumTf2InGameHours(): Promise<number> {
    return parseInt(
      await this.retrieve(ConfigurationEntryKey.minimumTf2InGameHours),
      10,
    );
  }

  async setMinimumTf2InGameHours(
    minimumTf2InGameHours: number,
  ): Promise<number> {
    await this.store(
      ConfigurationEntryKey.minimumTf2InGameHours,
      minimumTf2InGameHours.toString(),
    );
    return minimumTf2InGameHours;
  }

  async getVoiceServer(): Promise<VoiceServer> {
    return JSON.parse(await this.retrieve(ConfigurationEntryKey.voiceServer));
  }

  async setVoiceServer(voiceServer: VoiceServer): Promise<VoiceServer> {
    await this.store(
      ConfigurationEntryKey.voiceServer,
      JSON.stringify(voiceServer),
    );
    return voiceServer;
  }

  private async retrieve(key: ConfigurationEntryKey): Promise<string> {
    const ret = await this.configurationEntryModel
      .findOne({ key })
      .orFail()
      .lean()
      .exec();
    return ret.value;
  }

  private async store(key: ConfigurationEntryKey, value: string) {
    await this.configurationEntryModel
      .updateOne({ key }, { value }, { upsert: true })
      .lean()
      .exec();
  }

  private async loadDefault(key: ConfigurationEntryKey, value: string) {
    try {
      await this.retrieve(key);
    } catch (error) {
      await this.store(key, value);
    }
  }
}
