import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ServemeTfService } from './services/serveme-tf.service';
import { ServemeTfApiService } from './services/serveme-tf-api.service';
import { GameServersModule } from '@/game-servers/game-servers.module';
import { servemeTfGameServerModelProvider } from './serveme-tf-game-server-model.provider';
import { servemeTfConfigurationModelProvider } from './serveme-tf-configuration-model.provider';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { ServemeTfConfigurationService } from './services/serveme-tf-configuration.service';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => GameServersModule),
    ConfigurationModule,
  ],
  providers: [
    ServemeTfService,
    ServemeTfApiService,
    servemeTfGameServerModelProvider,
    servemeTfConfigurationModelProvider,
    ServemeTfConfigurationService,
  ],
})
export class ServemeTfModule {}
