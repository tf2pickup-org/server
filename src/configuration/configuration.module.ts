import { Module } from '@nestjs/common';
import { ConfigurationService } from './services/configuration.service';
import { ConfigurationController } from './controllers/configuration.controller';
import {
  ConfigurationEntry,
  configurationEntrySchema,
} from './models/configuration-entry';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ConfigurationEntry.name,
        schema: configurationEntrySchema,
      },
    ]),
  ],
  providers: [ConfigurationService],
  controllers: [ConfigurationController],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
