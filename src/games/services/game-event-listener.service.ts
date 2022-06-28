import { LogReceiverService } from '@/log-receiver/services/log-receiver.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as SteamID from 'steamid';
import { GameEventHandlerService } from './game-event-handler.service';
import { GamesService } from './games.service';

interface GameEvent {
  /* name of the game event */
  name: string;

  /* the event is triggered if a log line matches this regex */
  regex: RegExp;

  /* handle the event being triggered */
  handle: (gameId: string, matches: RegExpMatchArray) => Promise<unknown>;
}

@Injectable()
export class GameEventListenerService implements OnModuleInit {
  private logger = new Logger(GameEventListenerService.name);

  // events
  readonly gameEvents: GameEvent[] = [
    {
      name: 'match started',
      regex: /^[\d/\s-:]+World triggered "Round_Start"$/,
      handle: async (gameId) =>
        await this.gameEventHandlerService.onMatchStarted(gameId),
    },
    {
      name: 'match ended',
      regex: /^[\d/\s-:]+World triggered "Game_Over" reason ".*"$/,
      handle: async (gameId) =>
        await this.gameEventHandlerService.onMatchEnded(gameId),
    },
    {
      name: 'logs uploaded',
      regex: /^[\d/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/,
      handle: async (gameId, matches) => {
        const logsUrl = `http://logs.tf/${matches[1]}`;
        await this.gameEventHandlerService.onLogsUploaded(gameId, logsUrl);
      },
    },
    {
      name: 'player connected',
      // https://regex101.com/r/uyPW8m/4
      regex:
        /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><>"\sconnected,\saddress\s"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5})"$/,
      handle: async (gameId, matches) => {
        const steamId = new SteamID(matches[5]);
        if (steamId.isValid()) {
          await this.gameEventHandlerService.onPlayerJoining(
            gameId,
            steamId.getSteamID64(),
          );
        }
      },
    },
    {
      name: 'player joined team',
      // https://regex101.com/r/yzX9zG/1
      regex:
        /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.+)>"\sjoined\steam\s"(.+)"/,
      handle: async (gameId, matches) => {
        const steamId = new SteamID(matches[5]);
        if (steamId.isValid()) {
          await this.gameEventHandlerService.onPlayerConnected(
            gameId,
            steamId.getSteamID64(),
          );
        }
      },
    },
    {
      name: 'player disconnected',
      // https://regex101.com/r/x4AMTG/1
      regex:
        /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.[^>]+)>"\sdisconnected\s\(reason\s"(.[^"]+)"\)$/,
      handle: async (gameId, matches) => {
        const steamId = new SteamID(matches[5]);
        if (steamId.isValid()) {
          await this.gameEventHandlerService.onPlayerDisconnected(
            gameId,
            steamId.getSteamID64(),
          );
        }
      },
    },
    {
      name: 'score reported',
      // https://regex101.com/r/ZD6eLb/1
      regex:
        /^[\d/\s\-:]+Team "(.[^"]+)" current score "(\d)" with "(\d)" players$/,
      handle: async (gameId, matches) => {
        const [, teamName, score] = matches;
        await this.gameEventHandlerService.onScoreReported(
          gameId,
          teamName,
          score,
        );
      },
    },
    {
      name: 'final score reported',
      // https://regex101.com/r/RAUdTe/1
      regex:
        /^[\d/\s\-:]+Team "(.[^"]+)" final score "(\d)" with "(\d)" players$/,
      handle: async (gameId, matches) => {
        const [, teamName, score] = matches;
        await this.gameEventHandlerService.onScoreReported(
          gameId,
          teamName,
          score,
        );
      },
    },
    {
      name: 'demo uploaded',
      // https://regex101.com/r/JLGRYa/2
      regex: /^[\d/\s-:]+\[demos\.tf\]:\sSTV\savailable\sat:\s(.+)$/,
      handle: async (gameId, matches) => {
        const demoUrl = matches[1];
        await this.gameEventHandlerService.onDemoUploaded(gameId, demoUrl);
      },
    },
  ];

  constructor(
    private gameEventHandlerService: GameEventHandlerService,
    private gamesService: GamesService,
    private logReceiverService: LogReceiverService,
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
          const game = await this.gamesService.getByLogSecret(logSecret);
          this.logger.debug(`#${game.number}: ${gameEvent.name}`);
          await gameEvent.handle(game.id, matches);
        } catch (error) {
          this.logger.warn(`error handling event (${message}): ${error}`);
        }
        break;
      }
    }
  }
}
