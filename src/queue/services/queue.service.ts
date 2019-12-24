import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { QueueSlot } from '@/queue/queue-slot';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from './queue-config.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { BehaviorSubject, Observable, Subject, merge } from 'rxjs';
import { pairwise, distinctUntilChanged } from 'rxjs/operators';
import { GamesService } from '@/games/services/games.service';
import { OnlinePlayersService } from '@/players/services/online-players.service';

// waiting: waiting for players
// ready: players are expected to ready up
// launching: the game is being launched
type QueueState = 'waiting' | 'ready' | 'launching';

@Injectable()
export class QueueService implements OnModuleInit {

  slots: QueueSlot[] = [];
  private logger = new Logger(QueueService.name);
  private _stateChange = new BehaviorSubject<QueueState>('waiting');
  private timer: NodeJS.Timer;

  // events
  private _playerLeave = new Subject<string>();
  private _slotsChange = new Subject<QueueSlot[]>();

  get requiredPlayerCount(): number {
    return this.slots.length;
  }

  get playerCount(): number {
    return this.slots.filter(s => !!s.playerId).length;
  }

  get readyPlayerCount() {
    return this.slots.filter(s => s.ready).length;
  }

  get state(): QueueState {
    return this._stateChange.value;
  }

  get stateChange(): Observable<QueueState> {
    return this._stateChange.asObservable();
  }

  get playerLeave(): Observable<string> {
    return this._playerLeave.asObservable();
  }

  get slotsChange(): Observable<QueueSlot[]> {
    return this._slotsChange.asObservable();
  }

  constructor(
    private playersService: PlayersService,
    private queueConfigService: QueueConfigService,
    private playerBansService: PlayerBansService,
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    private onlinePlayersService: OnlinePlayersService,
  ) {
    this.stateChange.pipe(
      distinctUntilChanged(),
      pairwise(),
    ).subscribe(([oldState, newState]) => this.onStateChange(oldState, newState));

    this.resetSlots();
  }

  onModuleInit() {
    merge(
      this.playerBansService.banAdded,
      this.onlinePlayersService.playerLeft,
    ).subscribe(playerId => this.kick(playerId));
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
    this.resetSlots();
    this.logger.log('queue reset');
    this._slotsChange.next(this.slots);
    setImmediate(() => this.maybeUpdateState());
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

    if (!!targetSlot.playerId) {
      throw new Error('slot occupied');
    }

    // remove player from any slot(s) he could be occupying
    const oldSlots = this.slots.filter(s => s.playerId === playerId);
    const oldFriend = oldSlots.find(s => !!s.friend)?.friend;
    oldSlots.forEach(s => this.clearSlot(s));

    targetSlot.playerId = playerId;
    if (targetSlot.gameClass === 'medic') {
      targetSlot.friend = oldFriend;
    }
    if (this.state === 'ready') {
      targetSlot.ready = true;
    }

    this.logger.log(`player ${player.name} joined the queue (slotId=${targetSlot.id}, gameClass=${targetSlot.gameClass})`);
    const slots = [ targetSlot, ...oldSlots ];
    this._slotsChange.next(slots);
    setImmediate(() => this.maybeUpdateState());
    return slots;
  }

  leave(playerId: string): QueueSlot {
    const slot = this.findSlotByPlayerId(playerId);
    if (slot) {
      if (slot.ready && this.state !== 'waiting') {
        throw new Error('cannot leave at this stage');
      }

      this.clearSlot(slot);
      this.logger.log(`slot ${slot.id} (gameClass=${slot.gameClass}) free`);
      this._playerLeave.next(playerId);
      this._slotsChange.next([ slot ]);
      setImmediate(() => this.maybeUpdateState());
      return slot;
    } else {
      throw new Error('slot already free');
    }
  }

  kick(...playerIds: string[]) {
    if (this.state === 'launching') {
      return;
    }

    const slots = this.slots.filter(s => playerIds.includes(s.playerId));
    slots.forEach(slot => this._playerLeave.next(slot.playerId));
    slots.forEach(slot => this.clearSlot(slot));
    slots.forEach(slot => this.logger.log(`slot ${slot.id} (gameClass=${slot.gameClass}) free (player was kicked)`));
    this._slotsChange.next(slots);
    setImmediate(() => this.maybeUpdateState());
  }

  readyUp(playerId: string): QueueSlot {
    if (this.state !== 'ready') {
      throw new Error('queue not ready');
    }

    const slot = this.findSlotByPlayerId(playerId);
    if (slot) {
      slot.ready = true;
      this.logger.log(`slot ${slot.id} ready (${this.readyPlayerCount}/${this.requiredPlayerCount})`);
      this._slotsChange.next([ slot ]);
      setImmediate(() => this.maybeUpdateState());
      return slot;
    } else {
      throw new Error('player is not in the queue');
    }
  }

  async markFriend(playerId: string, friendId: string): Promise<QueueSlot> {
    if (this.state === 'launching') {
      throw new Error('unable to make friends now');
    }

    const slot = this.findSlotByPlayerId(playerId);
    if (!slot) {
      throw new Error('player is not in the queue');
    }

    if (slot.gameClass !== 'medic') { // todo make this configurable
      throw new Error('only medics are allowed to mark other players as friends');
    }

    const friendSlot = this.findSlotByPlayerId(friendId);
    if (friendSlot?.gameClass === 'medic') {
      throw new Error('cannot mark this player as a friend');
    }

    slot.friend = friendId;
    this._slotsChange.next([ slot ]);
    return slot;
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
    this._stateChange.next('waiting');
  }

}
