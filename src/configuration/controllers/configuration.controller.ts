import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerRole } from '@/players/models/player-role';
import { Body, ClassSerializerInterceptor, Controller, Get, Put, UseInterceptors, ValidationPipe } from '@nestjs/common';
import { DefaultPlayerSkill } from '../dto/default-player-skill';
import { WhitelistId } from '../dto/whitelist-id';
import { ConfigurationService } from '../services/configuration.service';

@Controller('configuration')
export class ConfigurationController {

  constructor(
    private configurationService: ConfigurationService,
  ) { }

  @Get('default-player-skill')
  @UseInterceptors(ClassSerializerInterceptor)
  async getDefaultPlayerSkill() {
    return new DefaultPlayerSkill(await this.configurationService.getDefaultPlayerSkill());
  }

  @Put('default-player-skill')
  @Auth(PlayerRole.admin)
  @UseInterceptors(ClassSerializerInterceptor)
  async setDefaultPlayerSkill(
    @Body(new ValidationPipe({ transform: true })) { value }: DefaultPlayerSkill,
  ) {
    return new DefaultPlayerSkill(await this.configurationService.setDefaultPlayerSkill(value));
  }

  @Get('whitelist-id')
  @UseInterceptors(ClassSerializerInterceptor)
  async getWhitelistId() {
    return new WhitelistId(await this.configurationService.getWhitelistId());
  }

  @Put('whitelist-id')
  @Auth(PlayerRole.admin)
  @UseInterceptors(ClassSerializerInterceptor)
  async setWhitelistId(@Body(new ValidationPipe()) { value }: WhitelistId) {
    return new WhitelistId(await this.configurationService.setWhitelistId(value));
  }

}
