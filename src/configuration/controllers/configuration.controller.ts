import { Auth } from '@/auth/decorators/auth.decorator';
import { Body, ClassSerializerInterceptor, Controller, Get, Put, UseInterceptors } from '@nestjs/common';
import { Configuration } from '../models/configuration';
import { ConfigurationService } from '../services/configuration.service';

@Controller('configuration')
export class ConfigurationController {

  constructor(
    private configurationService: ConfigurationService,
  ) { }

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  async getConfiguration() {
    return this.configurationService.getConfiguration();
  }

  @Put()
  @Auth('admin', 'super-user')
  @UseInterceptors(ClassSerializerInterceptor)
  async setConfiguration(@Body() configuration: Configuration) {
    return this.configurationService.setConfiguration(configuration);
  }

}
