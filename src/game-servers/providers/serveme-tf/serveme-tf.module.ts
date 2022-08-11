import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ServemeTfService } from './services/serveme-tf.service';
import { ServemeTfApiService } from './services/serveme-tf-api.service';
import { GameServersModule } from '@/game-servers/game-servers.module';
import { servemeTfConfigurationModelProvider } from './serveme-tf-configuration-model.provider';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { ServemeTfConfigurationService } from './services/serveme-tf-configuration.service';
import { ServemeTfController } from './controllers/serveme-tf.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ServemeTfGameServer,
  servemeTfGameServerSchema,
} from './models/serveme-tf-game-server';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => GameServersModule),
    ConfigurationModule,
    MongooseModule.forFeature([
      { name: ServemeTfGameServer.name, schema: servemeTfGameServerSchema },
    ]),
  ],
  providers: [
    ServemeTfService,
    ServemeTfApiService,
    servemeTfConfigurationModelProvider,
    ServemeTfConfigurationService,
  ],
  controllers: [ServemeTfController],
})
export class ServemeTfModule {}
