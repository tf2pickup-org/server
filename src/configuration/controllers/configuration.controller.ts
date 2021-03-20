import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerRole } from '@/players/models/player-role';
import { Body, ClassSerializerInterceptor, Controller, Get, Put, UseInterceptors, ValidationPipe } from '@nestjs/common';
import { DefaultPlayerSkill } from '../dto/default-player-skill';
import { Etf2lAccountRequired } from '../dto/etf2l-account-required';
import { MinimumTf2InGameHours } from '../dto/minimum-tf2-in-game-hours';
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

  @Get('etf2l-account-required')
  @UseInterceptors(ClassSerializerInterceptor)
  async isEtf2lAccountRequired() {
    return new Etf2lAccountRequired(await this.configurationService.isEtf2lAccountRequired());
  }

  @Put('etf2l-account-required')
  @Auth('admin', 'super-user')
  @UseInterceptors(ClassSerializerInterceptor)
  async setEtf2lAccountRequired(
    @Body(new ValidationPipe()) { value }: Etf2lAccountRequired,
  ) {
    return new Etf2lAccountRequired(await this.configurationService.setEtf2lAccountRequired(value));
  }

  @Get('minimum-tf2-in-game-hours')
  @UseInterceptors(ClassSerializerInterceptor)
  async getMinimumTf2InGameHours() {
    return new MinimumTf2InGameHours(await this.configurationService.getMinimumTf2InGameHours());
  }

  @Put('minimum-tf2-in-game-hours')
  @Auth('admin', 'super-user')
  @UseInterceptors(ClassSerializerInterceptor)
  async setMinimumTf2InGameHours(
    @Body(new ValidationPipe()) { value }: MinimumTf2InGameHours,
  ) {
    return new MinimumTf2InGameHours(await this.configurationService.setMinimumTf2InGameHours(value));
  }

}
