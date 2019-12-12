import { Injectable } from '@nestjs/common';
import { QueueSlot } from '@/queue/queue-slot';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from './queue-config.service';

// waiting: waiting for players
// ready: players are expected to ready up
// launching: the game is being launched
type QueueState = 'waiting' | 'ready' | 'launching';

@Injectable()
export class QueueService {

  slots: QueueSlot[] = [];
  private state: QueueState = 'waiting';

  constructor(
    private playersService: PlayersService,
    private queueConfigService: QueueConfigService,
  ) {
    this.resetSlots();
  }

  reset() {
    this.resetSlots();
  }

  /**
   * Player joins the queue.
   *
   * @param {number} slotId Slot id to take.
   * @param {string} playerId ID of the player who joins the queue.
   */
  async join(slotId: number, playerId: string): Promise<QueueSlot[]> {
    if (this.state === 'launching') {
      throw new Error('cannot join the queue at this stage');
    }

    const player = await this.playersService.getById(playerId);
    if (!player) {
      throw new Error('no such player');
    }

    const targetSlot = this.slots.find(s => s.id === slotId);
    if (!targetSlot) {
      throw new Error('no such slot');
    }

    if (!!targetSlot.playerId) {
      throw new Error('slot occupied');
    }

    // remove player from any slot(s) he could be occupying
    const oldSlots = this.slots.filter(s => s.playerId === playerId);
    oldSlots.forEach(s => this.clearSlot(s));

    targetSlot.playerId = playerId;
    if (this.state === 'ready') {
      targetSlot.ready = true;
    }

    return [ targetSlot, ...oldSlots ];
  }

  private resetSlots() {
    const defaultSlot: Partial<QueueSlot> = {
      playerId: null,
      ready: false,
    };

    let lastId = 0;
    this.slots = this.queueConfigService.queueConfig.classes.reduce((prev, curr) => {
      const tmpSlots = [];
      for (let i = 0; i < curr.count * this.queueConfigService.queueConfig.teamCount; ++i) {
        tmpSlots.push({
          id: lastId++,
          gameClass: curr.name,
          ...defaultSlot,
        });
      }

      return prev.concat(tmpSlots);
    }, []);
  }

  private clearSlot(slot: QueueSlot) {
    slot.playerId = null;
  }

}
