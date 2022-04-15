import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Error, Model } from 'mongoose';
import {
  ServemeTfConfiguration,
  ServemeTfConfigurationDocument,
} from '../models/serveme-tf-configuration';

@Injectable()
export class ServemeTfConfigurationService implements OnModuleInit {
  constructor(
    @InjectModel(ServemeTfConfiguration.name)
    private servemeTfConfigurationModel: Model<ServemeTfConfigurationDocument>,
  ) {}

  async onModuleInit() {
    try {
      await this.servemeTfConfigurationModel.findOne().orFail().lean().exec();
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        await this.servemeTfConfigurationModel.create({});
      }
    }
  }

  async getConfiguration(): Promise<ServemeTfConfiguration> {
    return plainToInstance(
      ServemeTfConfiguration,
      await this.servemeTfConfigurationModel.findOne().lean().exec(),
    );
  }

  async setConfiguration(configuration: ServemeTfConfiguration): Promise<void> {
    await this.servemeTfConfigurationModel.updateOne({}, configuration);
  }

  async getPreferredRegion(): Promise<string | null> {
    return (await this.getConfiguration()).preferredRegion;
  }

  async setPreferredRegion(preferredRegion: string): Promise<void> {
    await this.servemeTfConfigurationModel.updateOne(
      {},
      {
        preferredRegion,
      },
    );
  }
}
