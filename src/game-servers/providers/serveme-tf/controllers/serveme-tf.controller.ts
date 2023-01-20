import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerRole } from '@/players/models/player-role';
import { Controller, Get } from '@nestjs/common';
import { ServemeTfApiService } from '../services/serveme-tf-api.service';

@Controller('serveme-tf')
@Auth(PlayerRole.admin)
export class ServemeTfController {
  constructor(private servemeTfApiService: ServemeTfApiService) {}

  @Get('/servers')
  async listAllServers() {
    return await this.servemeTfApiService.listServers();
  }
}
