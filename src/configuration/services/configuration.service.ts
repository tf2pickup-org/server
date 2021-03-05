import { Injectable, OnModuleInit } from '@nestjs/common';
import { ReturnModelType } from '@typegoose/typegoose';
import { plainToClass } from 'class-transformer';
import { InjectModel } from 'nestjs-typegoose';
import { Configuration } from '../models/configuration';

@Injectable()
export class ConfigurationService implements OnModuleInit {

  constructor(
    @InjectModel(Configuration) private configurationModel: ReturnModelType<typeof Configuration>,
  ) { }

  async onModuleInit() {
    try {
      await this.configurationModel.findOne().orFail().lean().exec()
    } catch (e) {
      await this.configurationModel.create({ });
    }
  }

  async getConfiguration(): Promise<Configuration> {
    return plainToClass(Configuration, await this.configurationModel.findOne().lean().exec());
  }

  async setConfiguration(configuration: Configuration): Promise<Configuration> {
    await this.configurationModel.create(configuration);
    return this.getConfiguration();
  }

}
