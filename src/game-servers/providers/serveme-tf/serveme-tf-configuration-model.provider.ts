import {
  ConfigurationEntry,
  ConfigurationEntryDocument,
} from '@/configuration/models/configuration-entry';
import { Provider } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ServemeTfConfiguration,
  servemeTfConfigurationSchema,
} from './models/serveme-tf-configuration';

export const servemeTfConfigurationModelProvider: Provider = {
  provide: getModelToken(ServemeTfConfiguration.name),
  inject: [getModelToken(ConfigurationEntry.name)],
  useFactory: (configurationModel: Model<ConfigurationEntryDocument>) =>
    configurationModel.discriminator(
      'serveme-tf',
      servemeTfConfigurationSchema,
    ),
};
