import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Delete,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseFilters,
  HttpCode,
} from '@nestjs/common';
import { GameServersService } from '../services/game-servers.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Auth } from '@/auth/decorators/auth.decorator';
import { DocumentNotFoundFilter } from '@/shared/filters/document-not-found.filter';
import { GameServerDiagnosticsService } from '../services/game-server-diagnostics.service';
import { Environment } from '@/environment/environment';
import { User } from '@/auth/decorators/user.decorator';
import { Player } from '@/players/models/player';
import { PlayerRole } from '@/players/models/player-role';
import { ApiKey } from '@/auth/decorators/api-key.decorator';
import { GameServerHeartbeat } from '../dto/game-server-heartbeat';
import { RealIp } from 'nestjs-real-ip';

@Controller('game-servers')
export class GameServersController {
  constructor(
    private gameServersService: GameServersService,
    private gameServerDiagnosticsService: GameServerDiagnosticsService,
    private environment: Environment,
  ) {}

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  async getAllGameServers() {
    return await this.gameServersService.getAllGameServers();
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseFilters(DocumentNotFoundFilter)
  async getGameServer(
    @Param('id', ObjectIdValidationPipe) gameServerId: string,
  ) {
    return await this.gameServersService.getById(gameServerId);
  }

  @Post()
  @ApiKey()
  @UsePipes(ValidationPipe)
  @UseInterceptors(ClassSerializerInterceptor)
  async gameServerHeartbeat(
    @Body() heartbeat: GameServerHeartbeat,
    @RealIp() ip: string,
  ) {
    console.log(ip);
    // return this.gameServersService.addGameServer(gameServer, admin.id);
  }

  @Delete(':id')
  @Auth(PlayerRole.superUser)
  @UseFilters(DocumentNotFoundFilter)
  async removeGameServer(
    @Param('id', ObjectIdValidationPipe) gameServerId: string,
    @User() admin: Player,
  ) {
    await this.gameServersService.removeGameServer(gameServerId, admin.id);
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
