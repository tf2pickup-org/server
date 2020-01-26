import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LogReceiver, LogMessage } from 'srcds-log-receiver';
import * as SteamID from 'steamid';
import { Environment } from '@/environment/environment';
import { GameEventHandlerService } from './game-event-handler.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { GamesService } from './games.service';

interface GameEvent {
  /* name of the game event */
  name: string;

  /* the event is triggered if a log line matches this regex */
  regex: RegExp;

  /* handle the event being triggered */
  handle: (gameId: string, matches: RegExpMatchArray) => void;
}

@Injectable()
export class GameEventListenerService implements OnModuleInit {

  private logger = new Logger(GameEventListenerService.name);
  private logReceiver: LogReceiver;

  // events
  readonly gameEvents: GameEvent[] = [
    {
      name: 'match started',
      regex: /^[\d\/\s-:]+World triggered \"Round_Start\"$/,
      handle: gameId => this.gameEventHandlerService.onMatchStarted(gameId),
    },
    {
      name: 'match ended',
      regex: /^[\d\/\s-:]+World triggered \"Game_Over\" reason \".*\"$/,
      handle: gameId => this.gameEventHandlerService.onMatchEnded(gameId),
    },
    {
      name: 'logs uploaded',
      regex: /^[\d\/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/,
      handle: (gameId, matches) => {
        const logsUrl = `http://logs.tf/${matches[1]}`;
        this.gameEventHandlerService.onLogsUploaded(gameId, logsUrl);
      },
    },
    {
      name: 'player connected',
      // https://regex101.com/r/uyPW8m/4
      regex: /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s\"(.+)\<(\d+)\>\<(\[.[^\]]+\])\>\<\>"\sconnected,\saddress\s\"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5})"$/,
      handle: (gameId, matches) => {
        const steamId = new SteamID(matches[5]);
        if (steamId.isValid()) {
          this.gameEventHandlerService.onPlayerJoining(gameId, steamId.getSteamID64());
        }
      },
    },
    {
      name: 'player joined team',
      // https://regex101.com/r/yzX9zG/1
      regex: /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s\"(.+)\<(\d+)\>\<(\[.[^\]]+\])\>\<(.+)\>"\sjoined\steam\s\"(.+)\"/,
      handle: (gameId, matches) => {
        const steamId = new SteamID(matches[5]);
        if (steamId.isValid()) {
          this.gameEventHandlerService.onPlayerConnected(gameId, steamId.getSteamID64());
        }
      },
    },
    {
      name: 'player disconnected',
      // https://regex101.com/r/x4AMTG/1
      regex: /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s\"(.+)\<(\d+)\>\<(\[.[^\]]+\])\>\<(.[^\>]+)\>\"\sdisconnected\s\(reason\s\"(.[^\"]+)\"\)$/,
      handle: (gameId, matches) => {
        const steamId = new SteamID(matches[5]);
        if (steamId.isValid()) {
          this.gameEventHandlerService.onPlayerDisconnected(gameId, steamId.getSteamID64());
        }
      },
    },
    {
      name: 'score reported',
      // https://regex101.com/r/RAUdTe/1
      regex: /^[\d\/\s-:]+Team \"(.[^"]+)\" final score \"(\d)\" with \"(\d)\" players$/,
      handle: (gameId, matches) => {
        const [, teamName, score] = matches;
        this.gameEventHandlerService.onScoreReported(gameId, teamName, score);
      },
    },
  ];

  constructor(
    private environment: Environment,
    private gameEventHandlerService: GameEventHandlerService,
    private gameSeversService: GameServersService,
    private gamesService: GamesService,
  ) { }

  onModuleInit() {
    this.logReceiver = new LogReceiver({
      address: this.environment.logRelayAddress,
      port: parseInt(this.environment.logRelayPort, 10),
    });

    this.logger.verbose(`listening for incoming logs at ${this.logReceiver.opts.address}:${this.logReceiver.opts.port}`);

    this.logReceiver.on('data', (msg: LogMessage) => {
      if (msg.isValid) {
        this.logger.debug(msg.message);
        this.testForGameEvent(msg.message, { address: msg.receivedFrom.address, port: msg.receivedFrom.port });
      }
    });
  }

  private async testForGameEvent(message: string, eventSource: { address: string, port: number }) {
    for (const gameEvent of this.gameEvents) {
      const matches = message.match(gameEvent.regex);
      if (matches) {
        const gameServer = await this.gameSeversService.getGameServerByEventSource(eventSource);
        const game = await this.gamesService.findByAssignedGameServer(gameServer.id);
        this.logger.debug(`#${game.number}/${gameServer.name}: ${gameEvent.name}`);
        gameEvent.handle(game.id, matches);
        break;
      }
    }
  }

}
