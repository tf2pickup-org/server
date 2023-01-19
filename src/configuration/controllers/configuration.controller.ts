import { Controller, Get, Query } from '@nestjs/common';
import { ConfigurationService } from '../services/configuration.service';

@Controller('configuration')
export class ConfigurationController {
  constructor(private configurationService: ConfigurationService) {}

  @Get()
  async get(@Query('key') key?: string) {
    if (key) {
      return await this.configurationService.describe(key);
    } else {
      return await this.configurationService.describeAll();
    }
  }
}
