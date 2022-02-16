import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogForwarding } from './diagnostic-checks/log-forwarding';
import { RconConnection } from './diagnostic-checks/rcon-connection';
import {
  GameServerDiagnosticRun,
  gameServerDiagnosticRunSchema,
} from './models/game-server-diagnostic-run';
import { StaticGameServersService } from './services/static-game-servers.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: GameServerDiagnosticRun.name,
        schema: gameServerDiagnosticRunSchema,
      },
    ]),
  ],
  providers: [StaticGameServersService, RconConnection, LogForwarding],
})
export class StaticGameServerModule {}
