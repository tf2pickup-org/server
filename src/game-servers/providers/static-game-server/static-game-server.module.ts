import { GameServersModule } from '@/game-servers/game-servers.module';
import { LogReceiverModule } from '@/log-receiver/log-receiver.module';
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StaticGameServersController } from './controllers/static-game-servers.controller';
import { LogForwarding } from './diagnostic-checks/log-forwarding';
import { RconConnection } from './diagnostic-checks/rcon-connection';
import {
  GameServerDiagnosticRun,
  gameServerDiagnosticRunSchema,
} from './models/game-server-diagnostic-run';
import { GameServerDiagnosticsService } from './services/game-server-diagnostics.service';
import { StaticGameServersService } from './services/static-game-servers.service';

@Module({
  imports: [
    forwardRef(() => GameServersModule),
    MongooseModule.forFeature([
      {
        name: GameServerDiagnosticRun.name,
        schema: gameServerDiagnosticRunSchema,
      },
    ]),
    LogReceiverModule,
  ],
  providers: [
    StaticGameServersService,
    GameServerDiagnosticsService,
    RconConnection,
    LogForwarding,
  ],
  exports: [StaticGameServersService],
  controllers: [StaticGameServersController],
})
export class StaticGameServerModule {}
