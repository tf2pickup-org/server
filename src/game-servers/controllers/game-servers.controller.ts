import { Auth } from '@/auth/decorators/auth.decorator';
import { Secret } from '@/auth/decorators/secret.decorator';
import { SecretPurpose } from '@/auth/secret-purpose';
import { Environment } from '@/environment/environment';
import { PlayerRole } from '@/players/models/player-role';
import { Deprecated } from '@/shared/decorators/deprecated';
import { DocumentNotFoundFilter } from '@/shared/filters/document-not-found.filter';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseFilters,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RealIp } from 'nestjs-real-ip';
import { GameServerHeartbeat } from '../providers/static-game-server/dto/game-server-heartbeat';
import { GameServerDiagnosticsService } from '../providers/static-game-server/services/game-server-diagnostics.service';
import { StaticGameServersService } from '../providers/static-game-server/services/static-game-servers.service';
import { GameServersService } from '../services/game-servers.service';

@Controller('game-servers')
export class GameServersController {
  constructor(
    private gameServersService: GameServersService,
    /** TODO v9.0 remove */
    private staticGameServersService: StaticGameServersService,
    /** TODO v9.0 remove */
    private gameServerDiagnosticsService: GameServerDiagnosticsService,
    private environment: Environment,
  ) {}

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseFilters(DocumentNotFoundFilter)
  async getGameServer(
    @Param('id', ObjectIdValidationPipe) gameServerId: string,
  ) {
    return await this.gameServersService.getById(gameServerId);
  }

  /** TODO v9.0 remove */
  @Post()
  @Secret(SecretPurpose.gameServer)
  @UsePipes(ValidationPipe)
  @UseInterceptors(ClassSerializerInterceptor)
  @Deprecated()
  async gameServerHeartbeat(
    @Body() heartbeat: GameServerHeartbeat,
    @RealIp() internalIpAddress: string,
  ) {
    return this.staticGameServersService.heartbeat({
      ...heartbeat,
      internalIpAddress: heartbeat.internalIpAddress ?? internalIpAddress,
    });
  }

  /** TODO v9.0 remove */
  @Post(':id/diagnostics')
  @Auth(PlayerRole.superUser)
  @UseFilters(DocumentNotFoundFilter)
  @HttpCode(202)
  @Deprecated()
  async runDiagnostics(
    @Param('id', ObjectIdValidationPipe) gameServerId: string,
  ) {
    const id = await this.gameServerDiagnosticsService.runDiagnostics(
      gameServerId,
    );

    return {
      diagnosticRunId: id,
      tracking: {
        url: `${this.environment.apiUrl}/game-server-diagnostics/${id}`,
      },
    };
  }
}
