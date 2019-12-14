import { Controller, Get, Param, NotFoundException, Post, Body, UsePipes, ValidationPipe, Delete } from '@nestjs/common';
import { GameServersService } from '../services/game-servers.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Auth } from '@/auth/decorators/auth.decorator';
import { GameServer } from '../models/game-server';

@Controller('game-servers')
export class GameServersController {

  constructor(
    private gameServersService: GameServersService,
  ) { }

  @Get()
  async getAllGameServers() {
    return await this.gameServersService.getAllGameServers();
  }

  @Get(':id')
  async getGameServer(@Param('id', ObjectIdValidationPipe) gameServerId: string) {
    const gameServer = await this.gameServersService.getById(gameServerId);
    if (gameServer) {
      return gameServer;
    } else {
      throw new NotFoundException();
    }
  }

  @Post()
  @Auth('super-user')
  @UsePipes(ValidationPipe)
  async addGameServer(@Body() gameServer: GameServer) {
    return this.gameServersService.addGameServer(gameServer);
  }

  @Delete(':id')
  @Auth('super-user')
  async removeGameServer(@Param('id', ObjectIdValidationPipe) gameServerId: string) {
    await this.gameServersService.removeGameServer(gameServerId);
  }

}
