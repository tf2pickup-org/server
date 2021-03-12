import { Controller, Get, Param, Post, Body, UsePipes, ValidationPipe, Delete, UseInterceptors, ClassSerializerInterceptor, UseFilters } from '@nestjs/common';
import { GameServersService } from '../services/game-servers.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Auth } from '@/auth/decorators/auth.decorator';
import { DocumentNotFoundFilter } from '@/shared/filters/document-not-found.filter';
import { AddGameServer } from '../dto/add-game-server';

@Controller('game-servers')
export class GameServersController {

  constructor(
    private gameServersService: GameServersService,
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

}
