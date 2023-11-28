import { Events } from '@/events/events';
import { GameId } from '@/games/game-id';
import { GamesService } from '@/games/services/games.service';
import { LogReceiverService } from '@/log-receiver/services/log-receiver.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as SteamID from 'steamid';
import { fixTeamName } from '../utils/fix-team-name';

interface GameEvent {
  /* name of the game event */
  name: string;

  /* the event is triggered if a log line matches this regex */
  regex: RegExp;

  /* handle the event being triggered */
  handle: (gameId: GameId, matches: RegExpMatchArray) => void;
}

@Injectable()
export class GameEventListenerService implements OnModuleInit {
  private logger = new Logger(GameEventListenerService.name);

  // events
  readonly gameEvents: GameEvent[] = [
    {
      // TODO rename to "round start"
      name: 'match started',
      regex: /^[\d/\s-:]+World triggered "Round_Start"$/,
      handle: (gameId) => this.events.matchStarted.next({ gameId }),
    },
    {
      name: 'round win',
      // https://regex101.com/r/41LfKS/1
      regex:
        /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "Round_Win" \(winner "(.+)"\)$/,
      handle: (gameId, matches) => {
        const winner = fixTeamName(matches[1]);
        this.events.roundWin.next({ gameId, winner });
      },
    },
    {
      name: 'round length',
      // https://regex101.com/r/mvOYMz/1
      regex:
        /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "Round_Length" \(seconds "([\d.]+)"\)$/,
      handle: (gameId, matches) => {
        const seconds = parseFloat(matches[1]);
        this.events.roundLength.next({ gameId, lengthMs: seconds * 1000 });
      },
    },
    {
      // TODO rename to "game over"
      name: 'match ended',
      regex: /^[\d/\s-:]+World triggered "Game_Over" reason ".*"$/,
      handle: (gameId) => this.events.matchEnded.next({ gameId }),
    },
    {
      name: 'logs uploaded',
      regex: /^[\d/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/,
      handle: (gameId, matches) => {
        const logsUrl = `http://logs.tf/${matches[1]}`;
        this.events.logsUploaded.next({ gameId, logsUrl });
      },
    },
    {
      name: 'player connected',
      // https://regex101.com/r/uyPW8m/5
      regex:
        /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><>"\sconnected,\saddress\s"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})"$/,
      handle: (gameId, matches) => {
        const steamId = new SteamID(matches[5]);
        if (steamId.isValid()) {
          this.events.playerJoinedGameServer.next({
            gameId,
            steamId: steamId.getSteamID64(),
            ipAddress: matches[6],
          });
        }
      },
    },
    {
      name: 'player joined team',
      // https://regex101.com/r/yzX9zG/1
      regex:
        /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.+)>"\sjoined\steam\s"(.+)"/,
      handle: (gameId, matches) => {
        const steamId = new SteamID(matches[5]);
        if (steamId.isValid()) {
          this.events.playerJoinedTeam.next({
            gameId,
            steamId: steamId.getSteamID64(),
          });
        }
      },
    },
    {
      name: 'player disconnected',
      // https://regex101.com/r/x4AMTG/1
      regex:
        /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.[^>]+)>"\sdisconnected\s\(reason\s"(.[^"]+)"\)$/,
      handle: (gameId, matches) => {
        const steamId = new SteamID(matches[5]);
        if (steamId.isValid()) {
          this.events.playerDisconnectedFromGameServer.next({
            gameId,
            steamId: steamId.getSteamID64(),
          });
        }
      },
    },
    {
      name: 'score reported',
      // https://regex101.com/r/ZD6eLb/1
      regex:
        /^[\d/\s\-:]+Team "(.[^"]+)" current score "(\d)" with "(\d)" players$/,
      handle: (gameId, matches) => {
        const [, teamName, score] = matches;
        this.events.scoreReported.next({
          gameId,
          teamName: fixTeamName(teamName),
          score: parseInt(score, 10),
        });
      },
    },
    {
      name: 'final score reported',
      // https://regex101.com/r/RAUdTe/1
      regex:
        /^[\d/\s\-:]+Team "(.[^"]+)" final score "(\d)" with "(\d)" players$/,
      handle: (gameId, matches) => {
        const [, teamName, score] = matches;
        this.events.scoreReported.next({
          gameId,
          teamName: fixTeamName(teamName),
          score: parseInt(score, 10),
        });
      },
    },
    {
      name: 'demo uploaded',
      // https://regex101.com/r/JLGRYa/2
      regex: /^[\d/\s-:]+\[demos\.tf\]:\sSTV\savailable\sat:\s(.+)$/,
      handle: (gameId, matches) => {
        const demoUrl = matches[1];
        this.events.demoUploaded.next({ gameId, demoUrl });
      },
    },
    {
      name: 'player said',
      // https://regex101.com/r/zpFkkA/1
      regex:
        /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.[^>]+)>"\ssay\s"(.+)"$/,
      handle: (gameId, matches) => {
        const steamId = new SteamID(matches[5]);
        if (steamId.isValid()) {
          const message = matches[7];
          this.events.playerSaidInGameChat.next({
            gameId,
            steamId: steamId.getSteamID64(),
            message,
          });
        }
      },
    },
  ];

  constructor(
    private gamesService: GamesService,
    private logReceiverService: LogReceiverService,
    private events: Events,
  ) {}

  onModuleInit() {
    this.logReceiverService.data.subscribe(async (data) => {
      this.logger.debug(data.payload);
      await this.testForGameEvent(data.payload, data.password);
    });
  }

  private async testForGameEvent(message: string, logSecret: string) {
    for (const gameEvent of this.gameEvents) {
      const matches = message.match(gameEvent.regex);
      if (matches) {
        try {
          // skipcq: JS-0032
          const game = await this.gamesService.getByLogSecret(logSecret);
          this.logger.debug(`#${game.number}: ${gameEvent.name}`);
          gameEvent.handle(game._id, matches);
        } catch (error) {
          this.logger.warn(`error handling event (${message}): ${error}`);
        }
        break;
      }
    }
  }
}
