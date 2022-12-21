import { Controller, DefaultValuePipe, Get, Query } from '@nestjs/common';
import { ParseDatePipe } from '../pipes/parse-date.pipe';
import { StatisticsService } from '../services/statistics.service';
import { sub } from 'date-fns';

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
  async getGameLaunchesPerDay(
    @Query(
      'since',
      ParseDatePipe,
      new DefaultValuePipe(sub(Date.now(), { years: 1 })),
    )
    since: Date,
  ) {
    return await this.statisticsService.getGameLaunchesPerDay(since);
  }
}
