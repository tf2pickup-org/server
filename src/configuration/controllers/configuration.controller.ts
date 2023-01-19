import { DataParsingErrorFilter } from '@/shared/filters/data-parsing-error.filter';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseArrayPipe,
  Put,
  Query,
  UseFilters,
  ValidationPipe,
} from '@nestjs/common';
import { SetConfigurationEntry } from '../dto/set-configuration-entry';
import { ConfigurationEntryErrorFilter } from '../filters/configuration-entry-error.filter';
import { ConfigurationService } from '../services/configuration.service';

@Controller('configuration')
@UseFilters(ConfigurationEntryErrorFilter)
@UseFilters(DataParsingErrorFilter)
export class ConfigurationController {
  constructor(private configurationService: ConfigurationService) {}

  @Get()
  async get(
    @Query('keys', new DefaultValuePipe([]), ParseArrayPipe) keys?: string[],
  ) {
    if (keys && keys.length > 0) {
      return await Promise.all(
        keys.map(async (key) => await this.configurationService.describe(key)),
      );
    } else {
      return await this.configurationService.describeAll();
    }
  }

  @Put()
  async set(@Body(ValidationPipe) entries: SetConfigurationEntry[]) {
    return Promise.all(
      entries.map(async (entry) => {
        await this.configurationService.set(entry.key, entry.value);
        return await this.configurationService.describe(entry.key);
      }),
    );
  }
}
