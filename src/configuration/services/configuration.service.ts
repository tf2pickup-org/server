import { Injectable, OnModuleInit } from '@nestjs/common';
import { ReturnModelType } from '@typegoose/typegoose';
import { InjectModel } from 'nestjs-typegoose';
import { Configuration } from '../models/configuration';

@Injectable()
export class ConfigurationService implements OnModuleInit {

  constructor(
    @InjectModel(Configuration) private configurationModel: ReturnModelType<typeof Configuration>,
  ) { }

  async onModuleInit() {
    if (await this.configurationModel.findOne().lean().exec() === null) {
      await this.configurationModel.create({ });
    }
  }

  async getConfiguration(): Promise<Configuration> {
    return this.configurationModel.findOne().lean().exec();
  }

  async setConfiguration(configuration: Configuration): Promise<Configuration> {
    return this.configurationModel.create(configuration);
  }

}
