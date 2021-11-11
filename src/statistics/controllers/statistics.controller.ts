import { Controller, Get } from '@nestjs/common';
import { StatisticsService } from '../services/statistics.service';

@Controller('statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @Get('played-maps-count')
  async getPlayedMapsCount() {
    return await this.statisticsService.getPlayedMapsCount();
  }
}
