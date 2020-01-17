import { Injectable } from '@nestjs/common';
import { GamesService } from '@/games/services/games.service';

@Injectable()
export class QueueAnnouncementsService {

  constructor(
    private gamesService: GamesService,
  ) { }

  async substituteRequests() {
    const games = await this.gamesService.getGamesWithSubstitutionRequests();
    return games.flatMap(game => {
      return game.slots.flatMap(slot => {
        if (slot.status !== 'waiting for substitute') {
          return [];
        }

        return {
          gameId: game.id,
          gameNumber: game.number,
          gameClass: slot.gameClass,
          team: game.teams.get(slot.teamId),
        };
      });
    });
  }

}
