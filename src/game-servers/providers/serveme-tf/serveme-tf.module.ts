import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ServemeTfService } from './services/serveme-tf.service';
import { ServemeTfApiService } from './services/serveme-tf-api.service';
import { GameServersModule } from '@/game-servers/game-servers.module';
import { servemeTfConfigurationModelProvider } from './serveme-tf-configuration-model.provider';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { ServemeTfConfigurationService } from './services/serveme-tf-configuration.service';
import { ServemeTfController } from './controllers/serveme-tf.controller';
import {
  ServemeTfReservation,
  servemeTfReservationSchema,
} from './models/serveme-tf-reservation';
import { workaroundModelProvider } from '@/utils/workaround-model-provider';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => GameServersModule),
    ConfigurationModule,
  ],
  providers: [
    workaroundModelProvider({
      name: ServemeTfReservation.name,
      schema: servemeTfReservationSchema,
    }),
    ServemeTfService,
    ServemeTfApiService,
    servemeTfConfigurationModelProvider,
    ServemeTfConfigurationService,
  ],
  controllers: [ServemeTfController],
})
export class ServemeTfModule {}
