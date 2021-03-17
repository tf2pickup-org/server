import { Controller, Get, Param, Post, Body, UsePipes, ValidationPipe, Delete, UseInterceptors,
    ClassSerializerInterceptor, UseFilters, HttpCode } from '@nestjs/common';
import { GameServersService } from '../services/game-servers.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Auth } from '@/auth/decorators/auth.decorator';
import { DocumentNotFoundFilter } from '@/shared/filters/document-not-found.filter';
import { AddGameServer } from '../dto/add-game-server';
import { GameServerDiagnosticsService } from '../services/game-server-diagnostics.service';
import { Environment } from '@/environment/environment';

@Controller('game-servers')
export class GameServersController {

  constructor(
    private gameServersService: GameServersService,
    private gameServerDiagnosticsService: GameServerDiagnosticsService,
    private environment: Environment,
  ) { }

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  async getAllGameServers() {
    return await this.gameServersService.getAllGameServers();
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseFilters(DocumentNotFoundFilter)
  async getGameServer(@Param('id', ObjectIdValidationPipe) gameServerId: string) {
    return await this.gameServersService.getById(gameServerId);
  }

  @Post()
  @Auth('super-user')
  @UsePipes(ValidationPipe)
  @UseInterceptors(ClassSerializerInterceptor)
  async addGameServer(@Body() gameServer: AddGameServer) {
    return this.gameServersService.addGameServer(gameServer);
  }

  @Delete(':id')
  @Auth('super-user')
  async removeGameServer(@Param('id', ObjectIdValidationPipe) gameServerId: string) {
    await this.gameServersService.removeGameServer(gameServerId);
  }

  @Post(':id/diagnostics')
  @Auth('super-user')
  @HttpCode(202)
  async runDiagnostics(@Param('id', ObjectIdValidationPipe) gameServerId: string) {
    const id = await this.gameServerDiagnosticsService.runDiagnostics(gameServerId);
    return {
      tracking: {
        url: `${this.environment.apiUrl}/game-server-diagnostics/${id}`,
      },
    };
  }

}
