import {
  ConfigurationItem,
  ConfigurationItemDocument,
} from '@/configuration/models/configuration-item';
import { Provider } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ServemeTfConfiguration,
  servemeTfConfigurationSchema,
} from './models/serveme-tf-configuration';

export const servemeTfConfigurationModelProvider: Provider = {
  provide: getModelToken(ServemeTfConfiguration.name),
  inject: [getModelToken(ConfigurationItem.name)],
  useFactory: (configurationModel: Model<ConfigurationItemDocument>) =>
    configurationModel.discriminator(
      'serveme-tf',
      servemeTfConfigurationSchema,
    ),
};
