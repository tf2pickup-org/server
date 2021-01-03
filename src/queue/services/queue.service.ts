import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { QueueSlot } from '@/queue/queue-slot';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from './queue-config.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { GamesService } from '@/games/services/games.service';
import { QueueState } from '../queue-state';
import { readyUpTimeout, readyStateTimeout } from '@configs/queue';
import { Events } from '@/events/events';

@Injectable()
export class QueueService implements OnModuleInit {

  slots: QueueSlot[] = [];
  state: QueueState = 'waiting';

  private logger = new Logger(QueueService.name);
  private timer: NodeJS.Timer;

  get requiredPlayerCount(): number {
    return this.slots.length;
  }

  get playerCount(): number {
    return this.slots.filter(s => !!s.playerId).length;
  }

  get readyPlayerCount() {
    return this.slots.filter(s => s.ready).length;
  }

  constructor(
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private queueConfigService: QueueConfigService,
    private playerBansService: PlayerBansService,
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    private events: Events,
  ) { }

  onModuleInit() {
    this.resetSlots();
    this.events.queueSlotsChange.subscribe(() => this.maybeUpdateState());
    this.events.queueStateChange.subscribe(({ state }) => this.onStateChange(state));

    // merge(
    //   this.playerBansService.banAdded,
    //   this.onlinePlayersService.playerLeft,
    // ).subscribe(playerId => this.kick(playerId));
  }

  getSlotById(id: number): QueueSlot {
    return this.slots.find(s => s.id === id);
  }

  findSlotByPlayerId(playerId: string): QueueSlot {
    return this.slots.find(s => s.playerId === playerId);
  }

  isInQueue(playerId: string): boolean {
    return !!this.slots.find(s => s.playerId === playerId);
  }

  reset() {
    this.logger.debug('queue reset');
    this.resetSlots();
    this.events.queueSlotsChange.next({ slots: this.slots });
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

    if (!player.hasAcceptedRules) {
      throw new Error('player has not accepted rules');
    }

    const bans = await this.playerBansService.getPlayerActiveBans(playerId);
    if (bans.length > 0) {
      throw new Error('player is banned');
    }

    const game = await this.gamesService.getPlayerActiveGame(playerId);
    if (game) {
      throw new Error('player involved in a currently active game');
    }

    const targetSlot = this.getSlotById(slotId);
    if (!targetSlot) {
      throw new Error('no such slot');
    }

    if (targetSlot.playerId) {
      throw new Error('slot occupied');
    }

    // remove player from any slot(s) he could be occupying
    const oldSlots = this.slots.filter(s => s.playerId === playerId);
    oldSlots.forEach(s => this.clearSlot(s));

    targetSlot.playerId = playerId;

    if (this.state === 'ready') {
      targetSlot.ready = true;
    }

    this.logger.debug(`player ${player.name} joined the queue (slotId=${targetSlot.id}, gameClass=${targetSlot.gameClass})`);

    // is player joining instead of only changing slots?
    if (oldSlots.length === 0) {
      this.events.playerJoinsQueue.next({ playerId });
    }

    const slots = [ targetSlot, ...oldSlots ];
    this.events.queueSlotsChange.next({ slots })
    return slots;
  }

  leave(playerId: string): QueueSlot {
    const slot = this.findSlotByPlayerId(playerId);
    if (slot) {
      if (slot.ready && this.state !== 'waiting') {
        throw new Error('cannot leave at this stage');
      }

      this.clearSlot(slot);
      this.logger.debug(`slot ${slot.id} (gameClass=${slot.gameClass}) free`);
      this.events.playerLeavesQueue.next({ playerId, reason: 'manual' });
      this.events.queueSlotsChange.next({ slots: [ slot ] });
      return slot;
    } else {
      throw new Error('slot already free');
    }
  }

  kick(...playerIds: string[]) {
    if (this.state === 'launching') {
      return;
    }

    const updatedSlots: QueueSlot[] = [];

    for (const playerId of playerIds) {
      const slot = this.findSlotByPlayerId(playerId);
      if (slot) {
        this.clearSlot(slot);
        this.events.playerLeavesQueue.next({ playerId, reason: 'kicked' });
        this.logger.debug(`slot ${slot.id} (gameClass=${slot.gameClass}) free (player was kicked)`);
        updatedSlots.push(slot);
      }
    }

    this.events.queueSlotsChange.next({ slots: updatedSlots });
  }

  readyUp(playerId: string): QueueSlot {
    if (this.state !== 'ready') {
      throw new Error('queue not ready');
    }

    const slot = this.findSlotByPlayerId(playerId);
    if (slot) {
      slot.ready = true;
      this.logger.debug(`slot ${slot.id} ready (${this.readyPlayerCount}/${this.requiredPlayerCount})`);
      this.events.queueSlotsChange.next({ slots: [ slot ] });
      return slot;
    } else {
      throw new Error('player is not in the queue');
    }
  }

  private maybeUpdateState() {
    // check whether we can change state
    switch (this.state) {
      case 'waiting':
        if (this.playerCount === this.requiredPlayerCount) {
          this.setState('ready');
        }
        break;

      case 'ready':
        if (this.playerCount === 0) {
          this.setState('waiting');
        } else if (this.readyPlayerCount === this.requiredPlayerCount) {
          this.setState('launching');
        }
        break;

      case 'launching':
        this.setState('waiting');
        break;
    }
  }

  private onStateChange(state: QueueState) {
    switch (state) {
      case 'ready':
        this.timer = setTimeout(() => this.onReadyUpTimeout(), readyUpTimeout);
        break;

      case 'launching':
      case 'waiting':
        clearTimeout(this.timer);
        break;
    }
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
    slot.ready = false;
  }

  private onReadyUpTimeout() {
    if (this.readyPlayerCount < this.requiredPlayerCount) {
      this.kickUnreadyPlayers();
    }

    const nextTimeout = readyStateTimeout - readyUpTimeout;

    if (nextTimeout > 0) {
      this.timer = setTimeout(() => this.unreadyQueue(), nextTimeout);
    } else {
      this.unreadyQueue();
    }
  }

  private kickUnreadyPlayers() {
    this.logger.debug('kicking players that are not ready');
    const slots = this.slots.filter(s => !s.ready);
    this.kick(...slots.map(s => s.playerId));
  }

  private unreadyQueue() {
    const slots = this.slots.filter(s => !!s.playerId);
    slots.forEach(s => s.ready = false);
    this.events.queueSlotsChange.next({ slots });
    this.setState('waiting');
  }

  private setState(state: QueueState) {
    this.state = state;
    this.events.queueStateChange.next({ state });
  }

}
