import { SerializerInterceptor } from '@/shared/interceptors/serializer.interceptor';
import { Serializable } from '@/shared/serializable';
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { GameDto } from '../dto/game.dto';
import { GamesService } from '../services/games.service';

@Controller('games-with-substitution-requests')
export class GamesWithSubstitutionRequestsController {
  constructor(private gamesService: GamesService) {}

  @Get()
  @UseInterceptors(SerializerInterceptor)
  async getGamesWithSubstitutionRequests(): Promise<Serializable<GameDto>[]> {
    return await this.gamesService.getGamesWithSubstitutionRequests();
  }
}
