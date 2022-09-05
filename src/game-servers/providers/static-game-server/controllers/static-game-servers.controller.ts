import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseFilters,
  HttpCode,
} from '@nestjs/common';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Auth } from '@/auth/decorators/auth.decorator';
import { DocumentNotFoundFilter } from '@/shared/filters/document-not-found.filter';
import { GameServerDiagnosticsService } from '../services/game-server-diagnostics.service';
import { Environment } from '@/environment/environment';
import { PlayerRole } from '@/players/models/player-role';
import { Secret } from '@/auth/decorators/secret.decorator';
import { GameServerHeartbeat } from '../dto/game-server-heartbeat';
import { RealIp } from 'nestjs-real-ip';
import { SecretPurpose } from '@/auth/secret-purpose';
import { StaticGameServersService } from '../services/static-game-servers.service';

@Controller('static-game-servers')
export class StaticGameServersController {
  constructor(
    private staticGameServersService: StaticGameServersService,
    private gameServerDiagnosticsService: GameServerDiagnosticsService,
    private environment: Environment,
  ) {}

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  async getAllGameServers() {
    return await this.staticGameServersService.getAllGameServers();
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseFilters(DocumentNotFoundFilter)
  async getOneGameServer(
    @Param('id', ObjectIdValidationPipe) gameServerId: string,
  ) {
    return await this.staticGameServersService.getById(gameServerId);
  }

  @Post()
  @Secret(SecretPurpose.gameServer)
  @UsePipes(ValidationPipe)
  @UseInterceptors(ClassSerializerInterceptor)
  async gameServerHeartbeat(
    @Body() heartbeat: GameServerHeartbeat,
    @RealIp() internalIpAddress: string,
  ) {
    return await this.staticGameServersService.heartbeat({
      ...heartbeat,
      internalIpAddress: heartbeat.internalIpAddress ?? internalIpAddress,
    });
  }

  @Post(':id/diagnostics')
  @Auth(PlayerRole.superUser)
  @UseFilters(DocumentNotFoundFilter)
  @HttpCode(202)
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
