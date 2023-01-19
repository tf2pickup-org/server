import { Module } from '@nestjs/common';
import { ConfigurationService } from './services/configuration.service';
import { ConfigurationController } from './controllers/configuration.controller';
import {
  ConfigurationItem,
  configurationItemSchema,
} from './models/configuration-item';
import { MongooseModule } from '@nestjs/mongoose';

const configurationModelProvider = MongooseModule.forFeature([
  {
    name: ConfigurationItem.name,
    schema: configurationItemSchema,
  },
]);

@Module({
  imports: [configurationModelProvider],
  providers: [ConfigurationService],
  controllers: [ConfigurationController],
  exports: [ConfigurationService, configurationModelProvider],
})
export class ConfigurationModule {}
