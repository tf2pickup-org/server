import { Injectable, Logger } from '@nestjs/common';
import { QueueSlot } from '@/queue/queue-slot';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from './queue-config.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { pairwise, distinctUntilChanged } from 'rxjs/operators';

// waiting: waiting for players
// ready: players are expected to ready up
// launching: the game is being launched
type QueueState = 'waiting' | 'ready' | 'launching';

@Injectable()
export class QueueService {

  slots: QueueSlot[] = [];
  private logger = new Logger(QueueService.name);
  private _state = new BehaviorSubject<QueueState>('waiting');
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

  get state(): Observable<QueueState> {
    return this._state.asObservable();
  }

  constructor(
    private playersService: PlayersService,
    private queueConfigService: QueueConfigService,
    private playerBansService: PlayerBansService,
  ) {
    this.state.pipe(
      distinctUntilChanged(),
      pairwise(),
    ).subscribe(([oldState, newState]) => this.onStateChange(oldState, newState));

    this.resetSlots();
  }

  reset() {
    this.resetSlots();
    this.logger.log('queue reset');
    setImmediate(() => this.maybeUpdateState());
  }

  /**
   * Player joins the queue.
   *
   * @param {number} slotId Slot id to take.
   * @param {string} playerId ID of the player who joins the queue.
   */
  async join(slotId: number, playerId: string): Promise<QueueSlot[]> {
    if (this._state.value === 'launching') {
      throw new Error('cannot join the queue at this stage');
    }

    const player = await this.playersService.getById(playerId);
    if (!player) {
      throw new Error('no such player');
    }

    if (!player.hasAcceptedRules) {
      throw new Error('player has not accepted rules');
    }

    const bans = await this.playerBansService.getActiveBansForPlayer(playerId);
    if (bans.length > 0) {
      throw new Error('player is banned');
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
    if (this._state.value === 'ready') {
      targetSlot.ready = true;
    }

    this.logger.log(`player ${player.name} joined the queue (slotId=${targetSlot.id}, gameClass=${targetSlot.gameClass})`);
    setImmediate(() => this.maybeUpdateState());
    return [ targetSlot, ...oldSlots ];
  }

  async leave(playerId: string): Promise<QueueSlot> {
    const slot = this.slots.find(s => s.playerId === playerId);
    if (slot) {
      if (slot.ready && this._state.value !== 'waiting') {
        throw new Error('cannot leave at this stage');
      }

      this.clearSlot(slot);
      this.logger.log(`slot ${slot.id} (gameClass=${slot.gameClass}) free`);
      setImmediate(() => this.maybeUpdateState());
      return slot;
    } else {
      return null;
    }
  }

  kick(...playerIds: string[]) {
    if (this._state.value === 'launching') {
      return;
    }

    const slots = this.slots.filter(s => playerIds.includes(s.playerId));
    slots.forEach(s => this.clearSlot(s));
    slots.forEach(slot => this.logger.log(`slot ${slot.id} (gameClass=${slot.gameClass}) free (player was kicked)`));
    setImmediate(() => this.maybeUpdateState());
  }

  readyUp(playerId: string): QueueSlot {
    if (this._state.value !== 'ready') {
      throw new Error('queue not ready');
    }

    const slot = this.slots.find(s => s.playerId === playerId);
    if (slot) {
      slot.ready = true;
      this.logger.log(`slot ${slot.id} ready (${this.readyPlayerCount}/${this.requiredPlayerCount})`);
      setImmediate(() => this.maybeUpdateState());
      return slot;
    } else {
      throw new Error('player is not in the queue');
    }
  }

  getSlotById(id: number): QueueSlot {
    return this.slots.find(s => s.id === id);
  }

  isInQueue(playerId: string): boolean {
    return !!this.slots.find(s => s.playerId === playerId);
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

  private maybeUpdateState() {
    // check whether we can change state
    switch (this._state.value) {
      case 'waiting':
        if (this.playerCount === this.requiredPlayerCount) {
          this._state.next('ready');
        }
        break;

      case 'ready':
        if (this.playerCount === 0) {
          this._state.next('waiting');
        } else if (this.readyPlayerCount === this.requiredPlayerCount) {
          this._state.next('launching');
        }
        break;

      case 'launching':
        this._state.next('waiting');
        break;
    }
  }

  private onStateChange(oldState: QueueState, newState: QueueState) {
    if (oldState === 'waiting' && newState === 'ready') {
      this.timer = setTimeout(() => this.readyUpTimeout(), this.queueConfigService.queueConfig.readyUpTimeout);
    } else if (oldState === 'ready' && newState === 'launching') {
      clearTimeout(this.timer);
    }

    this.logger.log(`queue state change (${oldState} => ${newState})`);
  }

  private readyUpTimeout() {
    if (this.readyPlayerCount < this.requiredPlayerCount) {
      this.kickUnreadyPlayers();
    }

    const nextTimeout =
      this.queueConfigService.queueConfig.queueReadyTimeout - this.queueConfigService.queueConfig.readyUpTimeout;

    if (nextTimeout > 0) {
      setTimeout(() => this.unreadyQueue(), nextTimeout);
    } else {
      this.unreadyQueue();
    }
  }

  private kickUnreadyPlayers() {
    const slots = this.slots.filter(s => !s.ready);
    this.kick(...slots.map(s => s.playerId));
  }

  private unreadyQueue() {
    const slots = this.slots.filter(s => s.ready);
    slots.forEach(s => s.ready = false);
    this._state.next('waiting');
  }


}
