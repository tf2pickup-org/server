import { GameServersModule } from '@/game-servers/game-servers.module';
import { GamesModule } from '@/games/games.module';
import { LogReceiverModule } from '@/log-receiver/log-receiver.module';
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameServerDiagnosticsController } from './controllers/game-server-diagnostics.controller';
import { StaticGameServersController } from './controllers/static-game-servers.controller';
import { LogForwarding } from './diagnostic-checks/log-forwarding';
import { RconConnection } from './diagnostic-checks/rcon-connection';
import {
  GameServerDiagnosticRun,
  gameServerDiagnosticRunSchema,
} from './models/game-server-diagnostic-run';
import {
  StaticGameServer,
  staticGameServerSchema,
} from './models/static-game-server';
import { GameServerDiagnosticsService } from './services/game-server-diagnostics.service';
import { StaticGameServersService } from './services/static-game-servers.service';

@Module({
  imports: [
    forwardRef(() => GameServersModule),
    MongooseModule.forFeature([
      {
        name: StaticGameServer.name,
        schema: staticGameServerSchema,
      },
      {
        name: GameServerDiagnosticRun.name,
        schema: gameServerDiagnosticRunSchema,
      },
    ]),
    LogReceiverModule,
    forwardRef(() => GamesModule),
  ],
  providers: [
    StaticGameServersService,
    GameServerDiagnosticsService,
    RconConnection,
    LogForwarding,
  ],
  controllers: [StaticGameServersController, GameServerDiagnosticsController],
})
export class StaticGameServerModule {}
