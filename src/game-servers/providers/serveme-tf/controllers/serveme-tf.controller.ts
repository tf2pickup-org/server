import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerRole } from '@/players/models/player-role';
import { Controller, Get, Inject } from '@nestjs/common';
import { Client } from '@tf2pickup-org/serveme-tf-client';
import { SERVEME_TF_CLIENT } from '../serveme-tf-client.token';

@Controller('serveme-tf')
@Auth(PlayerRole.admin)
export class ServemeTfController {
  constructor(
    @Inject(SERVEME_TF_CLIENT)
    private readonly servemeTfClient: Client,
  ) {}

  @Get('/')
  isEnabled() {
    return { isEnabled: true };
  }

  @Get('/servers')
  async listAllServers() {
    const { servers } = await this.servemeTfClient.findOptions();
    return servers;
  }
}
