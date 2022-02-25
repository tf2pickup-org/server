import { DynamicModule, Module } from '@nestjs/common';
import { StaticGameServerModule } from './static-game-server/static-game-server.module';

@Module({})
export class GameServersProvidersModule {
  static configure(): DynamicModule {
    return {
      module: GameServersProvidersModule,
      imports: [StaticGameServerModule],
      exports: [StaticGameServerModule],
    };
  }
}
