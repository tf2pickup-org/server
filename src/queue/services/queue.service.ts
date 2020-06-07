import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { QueueSlot } from '@/queue/queue-slot';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from './queue-config.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { BehaviorSubject, Subject, merge } from 'rxjs';
import { pairwise, distinctUntilChanged } from 'rxjs/operators';
import { GamesService } from '@/games/services/games.service';
import { OnlinePlayersService } from '@/players/services/online-players.service';
import { ConfigService } from '@nestjs/config';
import { QueueState } from '../queue-state';
import { QueueGateway } from '../gateways/queue.gateway';
import { ObjectId } from 'mongodb';

@Injectable()
export class QueueService implements OnModuleInit {

  slots: QueueSlot[] = [];
  private logger = new Logger(QueueService.name);
  private _stateChange = new BehaviorSubject<QueueState>('waiting');
  private timer: NodeJS.Timer;
  private readyUpTimeout = this.configService.get<number>('queue.readyUpTimeout');
  private readyStateTimeout = this.configService.get<number>('queue.readyStateTimeout');

  // events
  private _playerJoin = new Subject<ObjectId>();
  private _playerLeave = new Subject<ObjectId>();
  private _slotsChange = new Subject<QueueSlot[]>();

  get requiredPlayerCount() {
    return this.slots.length;
  }

  get playerCount() {
    return this.slots.filter(s => !!s.playerId).length;
  }

  get readyPlayerCount() {
    return this.slots.filter(s => s.ready).length;
  }

  get state() {
    return this._stateChange.value;
  }

  get stateChange() {
    return this._stateChange.asObservable();
  }

  get playerJoin() {
    return this._playerJoin.asObservable();
  }

  get playerLeave() {
    return this._playerLeave.asObservable();
  }

  get slotsChange() {
    return this._slotsChange.asObservable();
  }

  constructor(
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private queueConfigService: QueueConfigService,
    private playerBansService: PlayerBansService,
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    private onlinePlayersService: OnlinePlayersService,
    private configService: ConfigService,
    @Inject(forwardRef(() => QueueGateway)) private queueGateway: QueueGateway,
  ) { }

  onModuleInit() {
    this.resetSlots();

    merge(
      this.playerBansService.banAdded,
      this.onlinePlayersService.playerLeft,
    ).subscribe(playerId => this.kick(playerId));

    this.stateChange.pipe(
      distinctUntilChanged(),
      pairwise(),
    ).subscribe(([oldState, newState]) => this.onStateChange(oldState, newState));

    this.slotsChange.subscribe(slots => this.queueGateway.emitSlotsUpdate(slots));
    this.stateChange.subscribe(state => this.queueGateway.emitStateUpdate(state));
  }

  getSlotById(id: number): QueueSlot {
    return this.slots.find(s => s.id === id);
  }

  findSlotByPlayerId(playerId: ObjectId): QueueSlot {
    return this.slots.find(s => playerId.equals(s.playerId));
  }

  isInQueue(playerId: ObjectId): boolean {
    return !!this.slots.find(s => playerId.equals(s.playerId));
  }

  reset() {
    this.resetSlots();
    this.logger.debug('queue reset');
    this._slotsChange.next(this.slots);
    setImmediate(() => this.maybeUpdateState());
  }

  /**
   * Player joins the queue.
   *
   * @param {number} slotId Slot id to take.
   * @param {string} playerId ID of the player who joins the queue.
   */
  async join(slotId: number, playerId: ObjectId): Promise<QueueSlot[]> {
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

    if (!!targetSlot.playerId) {
      throw new Error('slot occupied');
    }

    // remove player from any slot(s) he could be occupying
    const oldSlots = this.slots.filter(s => playerId.toString() === s.playerId);
    oldSlots.forEach(s => this.clearSlot(s));

    targetSlot.playerId = playerId.toString();

    if (this.state === 'ready' || this.playerCount === this.requiredPlayerCount) {
      targetSlot.ready = true;
    }

    this.logger.debug(`player ${player.name} joined the queue (slotId=${targetSlot.id}, gameClass=${targetSlot.gameClass})`);

    // is player joining instead of only changing slots?
    if (oldSlots.length === 0) {
      this._playerJoin.next(playerId);
    }

    const slots = [ targetSlot, ...oldSlots ];
    this._slotsChange.next(slots);
    setImmediate(() => this.maybeUpdateState());
    return slots;
  }

  leave(playerId: ObjectId): QueueSlot {
    const slot = this.findSlotByPlayerId(playerId);
    if (slot) {
      if (slot.ready && this.state !== 'waiting') {
        throw new Error('cannot leave at this stage');
      }

      this.clearSlot(slot);
      this.logger.debug(`slot ${slot.id} (gameClass=${slot.gameClass}) free`);
      this._playerLeave.next(playerId);
      this._slotsChange.next([ slot ]);
      setImmediate(() => this.maybeUpdateState());
      return slot;
    } else {
      throw new Error('slot already free');
    }
  }

  kick(...playerIds: ObjectId[]) {
    if (this.state === 'launching') {
      return;
    }

    const updatedSlots: QueueSlot[] = [];

    for (const playerId of playerIds) {
      const slot = this.findSlotByPlayerId(playerId);
      if (slot) {
        this.clearSlot(slot);
        this._playerLeave.next(playerId);
        this.logger.debug(`slot ${slot.id} (gameClass=${slot.gameClass}) free (player was kicked)`);
        updatedSlots.push(slot);
      }
    }

    this._slotsChange.next(updatedSlots);
    setImmediate(() => this.maybeUpdateState());
  }

  readyUp(playerId: ObjectId): QueueSlot {
    if (this.state !== 'ready') {
      throw new Error('queue not ready');
    }

    const slot = this.findSlotByPlayerId(playerId);
    if (slot) {
      slot.ready = true;
      this.logger.debug(`slot ${slot.id} ready (${this.readyPlayerCount}/${this.requiredPlayerCount})`);
      this._slotsChange.next([ slot ]);
      setImmediate(() => this.maybeUpdateState());
      return slot;
    } else {
      throw new Error('player is not in the queue');
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

  private maybeUpdateState() {
    // check whether we can change state
    switch (this.state) {
      case 'waiting':
        if (this.playerCount === this.requiredPlayerCount) {
          this._stateChange.next('ready');
        }
        break;

      case 'ready':
        if (this.playerCount === 0) {
          this._stateChange.next('waiting');
        } else if (this.readyPlayerCount === this.requiredPlayerCount) {
          this._stateChange.next('launching');
        }
        break;

      case 'launching':
        this._stateChange.next('waiting');
        break;
    }
  }

  private onStateChange(oldState: QueueState, newState: QueueState) {
    if (oldState === 'waiting' && newState === 'ready') {
      this.timer = setTimeout(() => this.onReadyUpTimeout(), this.readyUpTimeout);
    } else if (oldState === 'ready' && newState === 'launching') {
      clearTimeout(this.timer);
    } else if (oldState === 'ready' && newState === 'waiting') {
      clearTimeout(this.timer);
    }

    this.logger.debug(`queue state change (${oldState} => ${newState})`);
  }

  private onReadyUpTimeout() {
    if (this.readyPlayerCount < this.requiredPlayerCount) {
      this.kickUnreadyPlayers();
    }

    const nextTimeout = this.readyStateTimeout - this.readyUpTimeout;

    if (nextTimeout > 0) {
      this.timer = setTimeout(() => this.unreadyQueue(), nextTimeout);
    } else {
      this.unreadyQueue();
    }
  }

  private kickUnreadyPlayers() {
    this.logger.debug('kicking players that are not ready');
    const slots = this.slots.filter(s => !s.ready);
    this.kick(...slots.map(s => new ObjectId(s.playerId)));
  }

  private unreadyQueue() {
    const slots = this.slots.filter(s => !!s.playerId);
    slots.forEach(s => s.ready = false);
    this._slotsChange.next(slots);
    this._stateChange.next('waiting');
  }

}
