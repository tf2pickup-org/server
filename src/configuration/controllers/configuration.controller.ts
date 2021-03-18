import { Auth } from '@/auth/decorators/auth.decorator';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Body, ClassSerializerInterceptor, Controller, Get, Put, UseInterceptors } from '@nestjs/common';
import { ConfigurationService } from '../services/configuration.service';

@Controller('configuration')
export class ConfigurationController {

  constructor(
    private configurationService: ConfigurationService,
  ) { }

  @Get('default-player-skill')
  @UseInterceptors(ClassSerializerInterceptor)
  async getDefaultPlayerSkill() {
    return this.configurationService.getDefaultPlayerSkill();
  }

  @Put('default-player-skill')
  @Auth('admin', 'super-user')
  async setDefaultPlayerSkill(
    @Body() value: { [className in Tf2ClassName]?: number },
  ) {
    const valueAsMap = new Map(Object.entries(value)) as Map<Tf2ClassName, number>;
    return this.configurationService.setDefaultPlayerSkill(valueAsMap);
  }

  @Get('whitelist-id')
  async getWhitelistId() {
    return this.configurationService.getWhitelistId();
  }

  @Put('whitelist-id')
  @Auth('admin', 'super-user')
  async setWhitelistId(@Body() whitelistId: string) {
    return this.configurationService.setWhitelistId(whitelistId);
  }

}
