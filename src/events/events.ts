import { ConfigurationEntryKey } from '@/configuration/models/configuration-entry-key';
import { Game } from '@/games/models/game';
import { Tf2Team } from '@/games/models/tf2-team';
import { Player } from '@/players/models/player';
import { PlayerBan } from '@/players/models/player-ban';
import { PlayerSkillType } from '@/players/services/player-skill.service';
import { MapPoolEntry } from '@/queue/models/map-pool-entry';
import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { MapVoteResult } from '../queue/map-vote-result';
import { QueueSlot } from '../queue/queue-slot';
import { QueueState } from '../queue/queue-state';
import { Friendship } from '../queue/services/friends.service';

interface PlayerSkillChangedEventProps {
  playerId: string;
  oldSkill: PlayerSkillType;
  newSkill: PlayerSkillType;
  adminId?: string; //< ID of admin who made the change
}

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
    adminId?: string;
  }>();
  readonly playerConnects = new Subject<{ playerId: string }>();
  readonly playerDisconnects = new Subject<{ playerId: string }>();
  readonly playerBanAdded = new Subject<{ ban: PlayerBan }>();
  readonly playerBanRevoked = new Subject<{
    ban: PlayerBan;
    adminId?: string;
  }>();
  readonly playerSkillChanged = new Subject<PlayerSkillChangedEventProps>();
  readonly linkedProfilesChanged = new Subject<{ playerId: string }>();

  readonly playerJoinsQueue = new Subject<{ playerId: string }>();
  readonly playerLeavesQueue = new Subject<{
    playerId: string;
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
    actorId?: string;
  }>();

  readonly gameCreated = new Subject<{ game: Game }>();
  readonly gameChanges = new Subject<{
    newGame: Game;
    oldGame: Game;
    adminId?: string;
  }>();

  readonly matchStarted = new Subject<{ gameId: string }>();
  readonly matchEnded = new Subject<{ gameId: string }>();
  readonly playerJoinedGameServer = new Subject<{
    gameId: string;
    steamId: string;
  }>();
  readonly playerJoinedTeam = new Subject<{
    gameId: string;
    steamId: string;
  }>();
  readonly playerDisconnectedFromGameServer = new Subject<{
    gameId: string;
    steamId: string;
  }>();
  readonly scoreReported = new Subject<{
    gameId: string;
    teamName: Tf2Team;
    score: number;
  }>();
  readonly logsUploaded = new Subject<{ gameId: string; logsUrl: string }>();
  readonly demoUploaded = new Subject<{ gameId: string; demoUrl: string }>();

  readonly gameReconfigureRequested = new Subject<{
    gameId: string;
    adminId?: string;
  }>();

  readonly substituteRequested = new Subject<{
    gameId: string;
    playerId: string;
    adminId?: string;
  }>();
  readonly substituteRequestCanceled = new Subject<{
    gameId: string;
    playerId: string;
    adminId?: string;
  }>();
  readonly playerReplaced = new Subject<{
    gameId: string;
    replaceeId: string;
    replacementId: string;
  }>();
  /**
   * @deprecated
   */
  readonly substituteRequestsChange = new Subject<void>();

  readonly configurationEntryChanged = new Subject<{
    entryKey: ConfigurationEntryKey | string;
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
