import { Auth } from '@/auth/decorators/auth.decorator';
import { OmitProps } from '@/shared/decorators/omit-props.decorator';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { Configuration } from '../models/configuration';
import { ConfigurationService } from '../services/configuration.service';

@Controller('configuration')
export class ConfigurationController {

  constructor(
    private configurationService: ConfigurationService,
  ) { }

  @Get()
  @OmitProps('__v', '_id')
  async getConfiguration() {
    return this.configurationService.getConfiguration();
  }

  @Put()
  @Auth('admin', 'super-user')
  @OmitProps('__v', '_id')
  async setConfiguration(@Body() configuration: Configuration) {
    return this.configurationService.setConfiguration(configuration);
  }

}
