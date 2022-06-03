import { app } from '@/app';
import { PlayersService } from '@/players/services/players.service';
import { Serializable } from '@/shared/serializable';
import { QueueSlotDto } from '../dto/queue-slot.dto';
import { QueueSlot } from '../queue-slot';

export class QueueSlotWrapper extends Serializable<QueueSlotDto> {
  constructor(public readonly slot: QueueSlot) {
    super();
  }

  async serialize(): Promise<QueueSlotDto> {
    const playersService = app.get(PlayersService);
    return {
      id: this.slot.id,
      gameClass: this.slot.gameClass,
      player: this.slot.playerId
        ? await playersService.getById(this.slot.playerId)
        : undefined,
      ready: this.slot.ready,
      canMakeFriendsWith: this.slot.canMakeFriendsWith,
    };
  }
}
