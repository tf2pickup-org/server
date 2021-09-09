import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';
import { GamesService } from '../services/games.service';

@Controller('games-with-substitution-requests')
export class GamesWithSubstitutionRequestsController {
  constructor(private gamesService: GamesService) {}

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  async getGamesWithSubstitutionRequests() {
    return this.gamesService.getGamesWithSubstitutionRequests();
  }
}
