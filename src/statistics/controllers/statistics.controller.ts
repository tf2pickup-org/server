import { Controller, Get, Query } from '@nestjs/common';
import { ParseDatePipe } from '../pipes/parse-date.pipe';
import { StatisticsService } from '../services/statistics.service';

@Controller('statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @Get('played-maps-count')
  async getPlayedMapsCount() {
    return await this.statisticsService.getPlayedMapsCount();
  }

  @Get('game-launch-time-spans')
  async getGameLaunchDays() {
    return await this.statisticsService.getGameLaunchTimeSpans();
  }

  @Get('game-launches-per-day')
  async getGameLaunchesPerDay(@Query('since', ParseDatePipe) since: Date) {
    return await this.statisticsService.getGameLaunchesPerDay(since);
  }
}
