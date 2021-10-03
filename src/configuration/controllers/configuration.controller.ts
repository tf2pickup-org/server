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
import { DefaultPlayerSkill } from '../models/default-player-skill';
import { Etf2lAccountRequired } from '../models/etf2l-account-required';
import { MinimumTf2InGameHours } from '../models/minimum-tf2-in-game-hours';
import { VoiceServer } from '../models/voice-server';
import { WhitelistId } from '../models/whitelist-id';
import { ConfigurationService } from '../services/configuration.service';

@Controller('configuration')
@UseInterceptors(ClassSerializerInterceptor)
export class ConfigurationController {
  constructor(private configurationService: ConfigurationService) {}

  @Get('default-player-skill')
  async getDefaultPlayerSkill() {
    return await this.configurationService.getDefaultPlayerSkill();
  }

  @Put('default-player-skill')
  @Auth(PlayerRole.admin)
  async setDefaultPlayerSkill(
    @Body(new ValidationPipe({ transform: true }))
    defaultPlayerSkill: DefaultPlayerSkill,
  ) {
    await this.configurationService.set(defaultPlayerSkill);
    return await this.getDefaultPlayerSkill();
  }

  @Get('whitelist-id')
  async getWhitelistId() {
    return await this.configurationService.getWhitelistId();
  }

  @Put('whitelist-id')
  @Auth(PlayerRole.admin)
  async setWhitelistId(@Body(new ValidationPipe()) whitelistId: WhitelistId) {
    await this.configurationService.set(whitelistId);
    return await this.getWhitelistId();
  }

  @Get('etf2l-account-required')
  async isEtf2lAccountRequired() {
    return await this.configurationService.isEtf2lAccountRequired();
  }

  @Put('etf2l-account-required')
  @Auth(PlayerRole.admin)
  async setEtf2lAccountRequired(
    @Body(new ValidationPipe()) etf2lAccountRequired: Etf2lAccountRequired,
  ) {
    await this.configurationService.set(etf2lAccountRequired);
    return await this.isEtf2lAccountRequired();
  }

  @Get('minimum-tf2-in-game-hours')
  async getMinimumTf2InGameHours() {
    return await this.configurationService.getMinimumTf2InGameHours();
  }

  @Put('minimum-tf2-in-game-hours')
  @Auth(PlayerRole.admin)
  async setMinimumTf2InGameHours(
    @Body(new ValidationPipe()) minimumTf2InGameHours: MinimumTf2InGameHours,
  ) {
    await this.configurationService.set(minimumTf2InGameHours);
    return await this.getMinimumTf2InGameHours();
  }

  @Get('voice-server')
  async getVoiceServer() {
    return await this.configurationService.getVoiceServer();
  }

  @Put('voice-server')
  @Auth(PlayerRole.admin)
  async setVoiceServer(@Body(new ValidationPipe()) voiceServer: VoiceServer) {
    await this.configurationService.set(voiceServer);
    return await this.getVoiceServer();
  }
}
