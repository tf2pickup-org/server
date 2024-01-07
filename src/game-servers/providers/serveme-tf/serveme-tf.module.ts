import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module, Provider } from '@nestjs/common';
import { ServemeTfService } from './services/serveme-tf.service';
import { GameServersModule } from '@/game-servers/game-servers.module';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { ServemeTfConfigurationService } from './services/serveme-tf-configuration.service';
import { ServemeTfController } from './controllers/serveme-tf.controller';
import { Environment } from '@/environment/environment';
import { Client } from '@tf2pickup-org/serveme-tf-client';
import { SERVEME_TF_CLIENT } from './serveme-tf-client.token';

const servemeTfClientProvider: Provider = {
  provide: SERVEME_TF_CLIENT,
  inject: [Environment],
  useFactory: (environment: Environment) => {
    return new Client({
      apiKey: environment.servemeTfApiKey,
      endpoint: environment.servemeTfApiEndpoint,
    });
  },
};

@Module({
  imports: [
    HttpModule,
    forwardRef(() => GameServersModule),
    ConfigurationModule,
  ],
  providers: [
    ServemeTfService,
    ServemeTfConfigurationService,
    servemeTfClientProvider,
  ],
  controllers: [ServemeTfController],
})
export class ServemeTfModule {}
