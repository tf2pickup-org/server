import {
  Injectable,
  Logger,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  CACHE_MANAGER,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { QueueSlot } from '@/queue/queue-slot';
import { QueueState } from '../queue-state';
import { Events } from '@/events/events';
import { NoSuchSlotError } from '../errors/no-such-slot.error';
import { SlotOccupiedError } from '../errors/slot-occupied.error';
import { CannotLeaveAtThisQueueStateError } from '../errors/cannot-leave-at-this-queue-state.error';
import { PlayerNotInTheQueueError } from '../errors/player-not-in-the-queue.error';
import { WrongQueueStateError } from '../errors/wrong-queue-state.error';
import { CannotJoinAtThisQueueStateError } from '../errors/cannot-join-at-this-queue-state.error';
import { Cache } from 'cache-manager';
import { QueueConfig } from '@/queue-config/interfaces/queue-config';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayerId } from '@/players/types/player-id';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Types } from 'mongoose';

interface Queue {
  slots: {
    id: number;
    gameClass: Tf2ClassName;
    playerId: string | null;
    ready: boolean;
    canMakeFriendsWith?: Tf2ClassName[];
  }[];
  state: QueueState;
}

const clearSlot = (slot: QueueSlot) => {
  slot.playerId = null;
  slot.ready = false;
};

@Injectable()
export class QueueService
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy
{
  slots: QueueSlot[] = [];
  state: QueueState = QueueState.waiting;

  private logger = new Logger(QueueService.name);
  private timer?: NodeJS.Timer;
  private immediates: NodeJS.Immediate[] = [];
  private readyUpTimeout = 40 * 1000;
  private readyStateTimeout = 60 * 1000;

  get requiredPlayerCount(): number {
    return this.slots.length;
  }

  get playerCount(): number {
    return this.slots.filter((s) => Boolean(s.playerId)).length;
  }

  get readyPlayerCount() {
    return this.slots.filter((s) => s.ready).length;
  }

  constructor(
    @Inject('QUEUE_CONFIG')
    private readonly queueConfig: QueueConfig,
    private events: Events,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configurationService: ConfigurationService,
  ) {}

  onModuleInit() {
    this.resetSlots();
    this.events.queueSlotsChange.subscribe(() =>
      this.immediates.push(setImmediate(() => this.maybeUpdateState())),
    );
    this.events.queueStateChange.subscribe(({ state }) =>
      this.onStateChange(state),
    );
    this.events.playerDisconnects.subscribe(({ playerId }) =>
      this.kick(playerId),
    );
    this.events.playerBanAdded.subscribe(({ ban }) => this.kick(ban.player));

    this.events.queueSlotsChange.subscribe(() => this.cacheQueue());
    this.events.queueStateChange.subscribe(() => this.cacheQueue());
  }

  async onApplicationBootstrap() {
    this.readyUpTimeout = await this.configurationService.get<number>(
      'queue.ready_up_timeout',
    );
    this.readyStateTimeout = await this.configurationService.get<number>(
      'queue.ready_state_timeout',
    );

    const queue: Queue | undefined = await this.cache.get('queue');
    if (queue) {
      this.slots = queue.slots.map((slot) => ({
        ...slot,
        playerId: slot.playerId
          ? (new Types.ObjectId(slot.playerId) as PlayerId)
          : null,
      }));
      this.state = queue.state;
    }
  }

  onModuleDestroy() {
    clearTimeout(this.timer);
    this.immediates.forEach((i) => clearImmediate(i));
  }

  getSlotById(id: number): QueueSlot | undefined {
    return this.slots.find((s) => s.id === id);
  }

  findSlotByPlayerId(playerId: PlayerId): QueueSlot | undefined {
    return this.slots.find((s) => s.playerId?.equals(playerId));
  }

  isInQueue(playerId: PlayerId): boolean {
    return Boolean(this.slots.find((s) => s.playerId?.equals(playerId)));
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
  join(slotId: number, playerId: PlayerId): QueueSlot[] {
    if (this.state === QueueState.launching) {
      throw new CannotJoinAtThisQueueStateError(this.state);
    }

    const targetSlot = this.getSlotById(slotId);
    if (!targetSlot) {
      throw new NoSuchSlotError(slotId);
    }

    if (targetSlot.playerId) {
      throw new SlotOccupiedError(slotId);
    }

    // remove player from any slot(s) he could be occupying
    const oldSlots = this.slots.filter((s) => s.playerId?.equals(playerId));
    oldSlots.forEach((s) => clearSlot(s));

    targetSlot.playerId = playerId;

    if (
      this.state === QueueState.ready ||
      this.playerCount === this.requiredPlayerCount
    ) {
      targetSlot.ready = true;
    }

    this.logger.debug(
      `player ${playerId} joined the queue (slotId=${targetSlot.id}, gameClass=${targetSlot.gameClass})`,
    );

    // is player joining instead of only changing slots?
    if (oldSlots.length === 0) {
      this.events.playerJoinsQueue.next({ playerId });
    }

    const slots = [targetSlot, ...oldSlots];
    this.events.queueSlotsChange.next({ slots });
    return slots;
  }

  leave(playerId: PlayerId): QueueSlot {
    const slot = this.findSlotByPlayerId(playerId);
    if (!slot) {
      throw new PlayerNotInTheQueueError(playerId);
    }

    if (slot.ready && this.state !== QueueState.waiting) {
      throw new CannotLeaveAtThisQueueStateError(this.state);
    }

    clearSlot(slot);
    this.logger.debug(`slot ${slot.id} (gameClass=${slot.gameClass}) free`);
    this.events.playerLeavesQueue.next({ playerId, reason: 'manual' });
    this.events.queueSlotsChange.next({ slots: [slot] });
    return slot;
  }

  kick(...playerIds: PlayerId[]) {
    if (this.state === QueueState.launching) {
      return;
    }

    const updatedSlots: QueueSlot[] = [];

    for (const playerId of playerIds) {
      const slot = this.findSlotByPlayerId(playerId);
      if (slot) {
        clearSlot(slot);
        this.events.playerLeavesQueue.next({ playerId, reason: 'kicked' });
        this.logger.debug(
          `slot ${slot.id} (gameClass=${slot.gameClass}) free (player was kicked)`,
        );
        updatedSlots.push(slot);
      }
    }

    this.events.queueSlotsChange.next({ slots: updatedSlots });
  }

  readyUp(playerId: PlayerId): QueueSlot {
    if (this.state !== QueueState.ready) {
      throw new WrongQueueStateError(this.state);
    }

    const slot = this.findSlotByPlayerId(playerId);
    if (!slot) {
      throw new PlayerNotInTheQueueError(playerId);
    }

    slot.ready = true;
    this.logger.debug(
      `slot ${slot.id} ready (${this.readyPlayerCount}/${this.requiredPlayerCount})`,
    );
    this.events.queueSlotsChange.next({ slots: [slot] });
    return slot;
  }

  private maybeUpdateState() {
    // check whether we can change state
    switch (this.state) {
      case QueueState.waiting:
        if (this.playerCount === this.requiredPlayerCount) {
          this.setState(QueueState.ready);
        }
        break;

      case QueueState.ready:
        if (this.playerCount === 0) {
          this.setState(QueueState.waiting);
        } else if (this.readyPlayerCount === this.requiredPlayerCount) {
          this.setState(QueueState.launching);
        }
        break;

      case QueueState.launching:
        this.setState(QueueState.waiting);
        break;

      // no default
    }
  }

  private onStateChange(state: QueueState) {
    switch (state) {
      case QueueState.ready:
        clearTimeout(this.timer);
        this.timer = setTimeout(
          () => this.onReadyUpTimeout(),
          this.readyUpTimeout,
        );
        break;

      case QueueState.launching:
      case QueueState.waiting:
        clearTimeout(this.timer);
        break;

      // no default
    }
  }

  private resetSlots() {
    let lastId = 0;
    this.slots = this.queueConfig.classes.reduce<QueueSlot[]>((prev, curr) => {
      const tmpSlots: QueueSlot[] = [];
      for (let i = 0; i < curr.count * this.queueConfig.teamCount; ++i) {
        tmpSlots.push({
          id: lastId++,
          gameClass: curr.name,
          canMakeFriendsWith: curr.canMakeFriendsWith,
          playerId: null,
          ready: false,
        });
      }

      return prev.concat(tmpSlots);
    }, []);
  }

  private onReadyUpTimeout() {
    if (this.readyPlayerCount < this.requiredPlayerCount) {
      this.kickUnreadyPlayers();
    }

    const nextTimeout = this.readyStateTimeout - this.readyUpTimeout;

    if (nextTimeout > 0) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.unreadyQueue(), nextTimeout);
    } else {
      this.unreadyQueue();
    }
  }

  private kickUnreadyPlayers() {
    this.logger.debug('kicking players that are not ready');
    const slots = this.slots
      .filter((s) => !s.ready)
      .filter((s) => Boolean(s.playerId));
    this.kick(...slots.map((s) => s.playerId!));
  }

  private unreadyQueue() {
    const slots = this.slots.filter((s) => Boolean(s.playerId));
    slots.forEach((s) => (s.ready = false));
    this.events.queueSlotsChange.next({ slots });
    this.setState(QueueState.waiting);
  }

  private setState(state: QueueState) {
    this.state = state;
    this.events.queueStateChange.next({ state });
  }

  private serialize(): Queue {
    return {
      slots: this.slots.map((slot) => ({
        ...slot,
        playerId: slot.playerId?.toString() ?? null,
      })),
      state: this.state,
    };
  }

  private async cacheQueue() {
    await this.cache.set('queue', this.serialize(), 0);
  }
}
