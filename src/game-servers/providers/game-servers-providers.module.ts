import { DynamicModule, Module } from '@nestjs/common';
import { StaticGameServerModule } from './static-game-server/static-game-server.module';
import { ServemeTfModule } from './serveme-tf/serveme-tf.module';

@Module({})
export class GameServersProvidersModule {
  static configure(): DynamicModule {
    const enabledProviderModules = [StaticGameServerModule];

    // console.log(process.env);
    // if (process.env.SERVEME_TF_API_KEY) {
      enabledProviderModules.push(ServemeTfModule);
    // }

    return {
      module: GameServersProvidersModule,
      imports: enabledProviderModules,
      exports: enabledProviderModules,
    };
  }
}
