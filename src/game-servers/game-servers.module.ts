import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { GameServer } from './models/game-server';
import { GameServersService } from './services/game-servers.service';
import { GameServersController } from './controllers/game-servers.controller';
import { GameServerDiagnosticsService } from './services/game-server-diagnostics.service';
import { GameServerDiagnosticRun } from './models/game-server-diagnostic-run';
import { GameServerDiagnosticsController } from './controllers/game-server-diagnostics.controller';
import { ServerDiscovery } from './diagnostic-checks/server-discovery';
import { RconConnection } from './diagnostic-checks/rcon-connection';
import { LogForwarding } from './diagnostic-checks/log-forwarding';
import { LogReceiverModule } from '@/log-receiver/log-receiver.module';

@Module({
  imports: [
    TypegooseModule.forFeature([ GameServer, GameServerDiagnosticRun ]),
    LogReceiverModule,
  ],
  providers: [
    GameServersService,
    GameServerDiagnosticsService,
    ServerDiscovery,
    RconConnection,
    LogForwarding,
  ],
  exports: [
    GameServersService,
  ],
  controllers: [
    GameServersController,
    GameServerDiagnosticsController,
  ],
})
export class GameServersModule { }
