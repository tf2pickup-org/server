import { PlayersService } from '@/players/services/players.service';
import { Injectable } from '@nestjs/common';
import { QueueSlot } from '../queue-slot';

@Injectable()
export class PlayerPopulatorService {
  constructor(private playersService: PlayersService) {}

  async populatePlayer(slot: QueueSlot) {
    return {
      ...slot,
      player: slot.playerId
        ? await this.playersService.getById(slot.playerId)
        : null,
    };
  }

  async populatePlayers(slots: QueueSlot[]) {
    return Promise.all(slots.map((slot) => this.populatePlayer(slot)));
  }
}
