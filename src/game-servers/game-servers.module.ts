import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { GameServer } from './models/game-server';
import { GameServersService } from './services/game-servers.service';
import { GameServersController } from './controllers/game-servers.controller';
import { GameServerDiagnosticsService } from './services/game-server-diagnostics.service';
import { GameServerDiagnosticRun } from './models/game-server-diagnostic-run';
import { GameServerDiagnosticsController } from './controllers/game-server-diagnostics.controller';

@Module({
  imports: [
    TypegooseModule.forFeature([ GameServer, GameServerDiagnosticRun ]),
  ],
  providers: [
    GameServersService,
    GameServerDiagnosticsService,
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
