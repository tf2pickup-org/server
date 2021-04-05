import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { ConfigurationService } from './services/configuration.service';
import { ConfigurationController } from './controllers/configuration.controller';
import { ConfigurationEntry } from './models/configuration-entry';

@Module({
  imports: [
    TypegooseModule.forFeature([
      {
        typegooseClass: ConfigurationEntry,
        schemaOptions: {
          collection: 'configuration',
        },
      },
    ]),
  ],
  providers: [ConfigurationService],
  controllers: [ConfigurationController],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
