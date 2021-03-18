import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ReturnModelType } from '@typegoose/typegoose';
import { InjectModel } from 'nestjs-typegoose';
import { ConfigurationEntry } from '../models/configuration-entry';
import { ConfigurationEntryKey } from '../models/configuration-entry-key';

// this name wtf
const defaultDefaultPlayerSkill = new Map(Object.keys(Tf2ClassName).map(className => [className, 1]));

@Injectable()
export class ConfigurationService implements OnModuleInit {

  constructor(
    @InjectModel(ConfigurationEntry) private configurationEntryModel: ReturnModelType<typeof ConfigurationEntry>,
  ) { }

  async onModuleInit() {
    await Promise.all([
      this.loadDefault(ConfigurationEntryKey.defaultPlayerSkill, JSON.stringify(Object.fromEntries(defaultDefaultPlayerSkill.entries()))),
      this.loadDefault(ConfigurationEntryKey.whitelistId, ''),
    ]);
  }

  async getDefaultPlayerSkill(): Promise<Map<Tf2ClassName, number>> {
    const value = await this.retrieve(ConfigurationEntryKey.defaultPlayerSkill);
    return new Map(Object.entries(JSON.parse(value))) as Map<Tf2ClassName, number>;
  }

  async setDefaultPlayerSkill(defaultPlayerSkill: Map<Tf2ClassName, number>): Promise<Map<Tf2ClassName, number>> {
    await this.store(ConfigurationEntryKey.defaultPlayerSkill, JSON.stringify(Object.fromEntries(defaultPlayerSkill)));
    return defaultPlayerSkill;
  }

  async getWhitelistId(): Promise<string> {
    return await this.retrieve(ConfigurationEntryKey.whitelistId);
  }

  async setWhitelistId(whitelistId: string): Promise<string> {
    await this.store(ConfigurationEntryKey.whitelistId, whitelistId);
    return whitelistId;
  }

  private async retrieve(key: ConfigurationEntryKey): Promise<string> {
    const ret = await this.configurationEntryModel.findOne({ key }).orFail().lean().exec()
    return ret.value;
  }

  private async store(key: ConfigurationEntryKey, value: string) {
    await this.configurationEntryModel.updateOne({ key }, { value }).orFail().lean().exec();
  }

  private async loadDefault(key: ConfigurationEntryKey, value: string) {
    try {
      await this.retrieve(key);
    } catch (error) {
      await this.configurationEntryModel.updateOne({ key }, { value }, { upsert: true });
    }
  }

}
