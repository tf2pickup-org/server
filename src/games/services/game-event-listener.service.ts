import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LogReceiver, LogMessage } from 'srcds-log-receiver';
import { GameRunnerManagerService } from './game-runner-manager.service';
import * as SteamID from 'steamid';
import { GameRunner } from '../game-runner';
import { Environment } from '@/environment/environment';

interface GameEvent {
  /* name of the game event */
  name: string;

  /* the event is triggered if a log line matches this regex */
  regex: RegExp;

  /* handle the event being triggered */
  handle: (gameRunner: GameRunner, matches: RegExpMatchArray) => void;
}

const gameEvents: GameEvent[] = [
  {
    name: 'match started',
    regex: /^[\d\/\s-:]+World triggered \"Round_Start\"$/,
    handle: gameRunner => gameRunner.onMatchStarted(),
  },
  {
    name: 'match ended',
    regex: /^[\d\/\s-:]+World triggered \"Game_Over\" reason \".*\"$/,
    handle: gameRunner => gameRunner.onMatchEnded(),
  },
  {
    name: 'logs uploaded',
    regex: /^[\d\/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/,
    handle: (gameRunner, matches) => {
      const logsUrl = `http://logs.tf/${matches[1]}`;
      gameRunner.onLogsUploaded(logsUrl);
    },
  },
  {
    name: 'player connected',
    // https://regex101.com/r/uyPW8m/4
    regex: /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s\"(.+)\<(\d+)\>\<(\[.[^\]]+\])\>\<\>"\sconnected,\saddress\s\"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5})"$/,
    handle: (gameRunner, matches) => {
      const steamId = new SteamID(matches[5]);
      if (steamId.isValid()) {
        gameRunner.onPlayerJoining(steamId.getSteamID64());
      }
    },
  },
  {
    name: 'player joined team',
    // https://regex101.com/r/yzX9zG/1
    regex: /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s\"(.+)\<(\d+)\>\<(\[.[^\]]+\])\>\<(.+)\>"\sjoined\steam\s\"(.+)\"/,
    handle: (gameRunner, matches) => {
      const steamId = new SteamID(matches[5]);
      if (steamId.isValid()) {
        gameRunner.onPlayerConnected(steamId.getSteamID64());
      }
    },
  },
  {
    name: 'player disconnected',
    // https://regex101.com/r/x4AMTG/1
    regex: /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s\"(.+)\<(\d+)\>\<(\[.[^\]]+\])\>\<(.[^\>]+)\>\"\sdisconnected\s\(reason\s\"(.[^\"]+)\"\)$/,
    handle: (gameRunner, matches) => {
      const steamId = new SteamID(matches[5]);
      if (steamId.isValid()) {
        gameRunner.onPlayerDisconnected(steamId.getSteamID64());
      }
    },
  },
];

@Injectable()
export class GameEventListenerService implements OnModuleInit {

  private logger = new Logger(GameEventListenerService.name);
  private logReceiver: LogReceiver;

  constructor(
    private environment: Environment,
    private gameRunnerManagerService: GameRunnerManagerService,
  ) { }

  onModuleInit() {
    this.logReceiver = new LogReceiver({
      address: this.environment.logRelayAddress,
      port: parseInt(this.environment.logRelayPort, 10),
    });

    this.logger.log(`listening for incoming logs at ${this.logReceiver.opts.address}:${this.logReceiver.opts.port}`);

    this.logReceiver.on('data', (msg: LogMessage) => {
      if (msg.isValid) {
        this.logger.debug(msg.message);
        this.testForGameEvent(msg.message, `${msg.receivedFrom.address}:${msg.receivedFrom.port}`);
      }
    });
  }

  private testForGameEvent(message: string, eventSource: string) {
    for (const gameEvent of gameEvents) {
      const matches = message.match(gameEvent.regex);
      if (matches) {
        this.logger.debug(gameEvent.name);
        const gameRunner = this.gameRunnerManagerService.findGameRunnerByEventSource(eventSource);
        gameEvent.handle(gameRunner, matches);
      }
    }
  }

}
