import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerRole } from '@/players/models/player-role';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Put,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ServemeTfConfiguration } from '../models/serveme-tf-configuration';
import { ServemeTfApiService } from '../services/serveme-tf-api.service';
import { ServemeTfConfigurationService } from '../services/serveme-tf-configuration.service';

@Controller('serveme-tf')
@Auth(PlayerRole.admin)
export class ServemeTfController {
  constructor(
    private servemeTfApiService: ServemeTfApiService,
    private servemeTfConfigurationService: ServemeTfConfigurationService,
  ) {}

  @Get('/servers')
  async listAllServers() {
    return await this.servemeTfApiService.listServers();
  }

  @Get('/configuration')
  @UseInterceptors(ClassSerializerInterceptor)
  async getConfiguration() {
    return await this.servemeTfConfigurationService.getConfiguration();
  }

  @Put('/configuration')
  @UseInterceptors(ClassSerializerInterceptor)
  async setConfiguration(
    @Body(new ValidationPipe({ transform: true }))
    configuration: ServemeTfConfiguration,
  ) {
    await this.servemeTfConfigurationService.setConfiguration(configuration);
    return await this.getConfiguration();
  }
}
