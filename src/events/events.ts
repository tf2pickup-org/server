import { GameId } from '@/games/game-id';
import { Game } from '@/games/models/game';
import { Tf2Team } from '@/games/models/tf2-team';
import { Player } from '@/players/models/player';
import { PlayerBan } from '@/players/models/player-ban';
import { PlayerId } from '@/players/types/player-id';
import { MapPoolEntry } from '@/queue/models/map-pool-entry';
import { UserMetadata } from '@/shared/user-metadata';
import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { MapVoteResult } from '../queue/map-vote-result';
import { QueueSlot } from '../queue/queue-slot';
import { QueueState } from '../queue/queue-state';
import { Friendship } from '../queue/services/friends.service';

/**
 * List of all events that occur in the application.
 */
@Injectable()
export class Events {
  private logger = new Logger(Events.name);

  readonly playerRegisters = new Subject<{ player: Player }>();
  readonly playerUpdates = new Subject<{
    oldPlayer: Player;
    newPlayer: Player;
    adminId?: PlayerId;
  }>();
  readonly playerConnects = new Subject<{
    playerId: PlayerId;
    metadata: UserMetadata;
  }>();
  readonly playerDisconnects = new Subject<{ playerId: PlayerId }>();
  readonly playerBanAdded = new Subject<{ ban: PlayerBan }>();
  readonly playerBanRevoked = new Subject<{
    ban: PlayerBan;
    adminId?: PlayerId;
  }>();
  readonly linkedProfilesChanged = new Subject<{ playerId: PlayerId }>();

  readonly playerJoinsQueue = new Subject<{ playerId: PlayerId }>();
  readonly playerLeavesQueue = new Subject<{
    playerId: PlayerId;
    reason: 'manual' | 'kicked';
  }>();
  readonly queueSlotsChange = new Subject<{ slots: QueueSlot[] }>();
  readonly queueStateChange = new Subject<{ state: QueueState }>();
  readonly queueFriendshipsChange = new Subject<{
    friendships: Friendship[];
  }>();
  readonly mapVotesChange = new Subject<{ results: MapVoteResult[] }>();

  readonly mapPoolChange = new Subject<{ maps: MapPoolEntry[] }>();
  readonly mapsScrambled = new Subject<{
    mapOptions: string[];
    actorId?: PlayerId;
  }>();

  readonly gameCreated = new Subject<{ game: Game }>();
  readonly gameChanges = new Subject<{
    newGame: Game;
    oldGame: Game;
    adminId?: PlayerId;
  }>();

  readonly matchStarted = new Subject<{ gameId: GameId }>();
  readonly matchEnded = new Subject<{ gameId: GameId }>();
  readonly playerJoinedGameServer = new Subject<{
    gameId: GameId;
    steamId: string;
    ipAddress: string;
  }>();
  readonly playerJoinedTeam = new Subject<{
    gameId: GameId;
    steamId: string;
  }>();
  readonly playerDisconnectedFromGameServer = new Subject<{
    gameId: GameId;
    steamId: string;
  }>();
  readonly playerSaidInGameChat = new Subject<{
    gameId: GameId;
    steamId: string;
    message: string;
  }>();
  readonly roundWin = new Subject<{
    gameId: GameId;
    winner: Tf2Team;
  }>();
  readonly roundLength = new Subject<{ gameId: GameId; lengthMs: number }>();
  readonly scoreReported = new Subject<{
    gameId: GameId;
    teamName: Tf2Team;
    score: number;
  }>();
  readonly logsUploaded = new Subject<{ gameId: GameId; logsUrl: string }>();
  readonly demoUploaded = new Subject<{ gameId: GameId; demoUrl: string }>();

  readonly gameReconfigureRequested = new Subject<{
    gameId: GameId;
    adminId?: PlayerId;
  }>();

  readonly substituteRequested = new Subject<{
    gameId: GameId;
    playerId: PlayerId;
    adminId?: PlayerId;
  }>();
  readonly substituteRequestCanceled = new Subject<{
    gameId: GameId;
    playerId: PlayerId;
    adminId?: PlayerId;
  }>();
  readonly playerReplaced = new Subject<{
    gameId: GameId;
    replaceeId: PlayerId;
    replacementId: PlayerId;
  }>();
  /**
   * @deprecated
   */
  readonly substituteRequestsChange = new Subject<void>();

  readonly configurationChanged = new Subject<{
    key: string;
    oldValue: unknown;
    newValue: unknown;
  }>();

  constructor() {
    for (const eventName in this) {
      const prop = this[eventName] as any;
      if (prop instanceof Subject) {
        prop.subscribe((...args) =>
          this.logger.debug(`${eventName}: ${JSON.stringify(args)}`),
        );
      }
    }
  }
}
