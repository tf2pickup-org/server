import { DynamicModule, Module } from '@nestjs/common';
import { StaticGameServerModule } from './static-game-server/static-game-server.module';
import { ServemeTfModule } from './serveme-tf/serveme-tf.module';
import { ConfigModule } from '@nestjs/config';

@Module({})
export class GameServersProvidersModule {
  static async configure(): Promise<DynamicModule> {
    await ConfigModule.envVariablesLoaded;

    const enabledProviders = [StaticGameServerModule];

    if (process.env.SERVEME_TF_API_KEY) {
      enabledProviders.push(ServemeTfModule);
    }

    return {
      module: GameServersProvidersModule,
      imports: [...enabledProviders],
      exports: [...enabledProviders],
    };
  }
}
