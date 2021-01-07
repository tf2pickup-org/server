import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { GamesService } from '@/games/services/games.service';
import { SubstituteRequest } from '../substitute-request';
import { SlotStatus } from '@/games/models/slot-status';

@Injectable()
export class QueueAnnouncementsService {

  constructor(
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
  ) { }

  async substituteRequests(): Promise<SubstituteRequest[]> {
    const games = await this.gamesService.getGamesWithSubstitutionRequests();
    return games.flatMap(game => {
      return game.slots.flatMap(slot => {
        if (slot.status !== SlotStatus.waitingForSubstitute) {
          return [];
        }

        return {
          gameId: game.id,
          gameNumber: game.number,
          gameClass: slot.gameClass,
          team: slot.team.toUpperCase(),
        };
      });
    });
  }

}
