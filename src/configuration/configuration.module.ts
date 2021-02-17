import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { Configuration } from './models/configuration';
import { ConfigurationService } from './services/configuration.service';
import { ConfigurationController } from './controllers/configuration.controller';

@Module({
  imports: [
    TypegooseModule.forFeature([
      {
        typegooseClass: Configuration,
        schemaOptions: {
          collection: 'configuration',
          capped: { size: 1024, max: 1 },
        },
      },
    ]),
  ],
  providers: [
    ConfigurationService,
  ],
  controllers: [
    ConfigurationController,
  ],
  exports: [
    ConfigurationService,
  ],
})
export class ConfigurationModule { }
