import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import { LogReceiver, LogMessage } from 'srcds-log-receiver';
import { Subject } from 'rxjs';
import { GameRunnerManagerService } from './game-runner-manager.service';
import * as SteamID from 'steamid';

export interface GameEventSource {
  address: string;
  port: number;
}

@Injectable()
export class GameEventListenerService {

  private logger = new Logger(GameEventListenerService.name);
  private logReceiver: LogReceiver;
  private _matchStarted = new Subject<string>();
  private _matchEnded = new Subject<string>();
  private _logsUploaded = new Subject<{ gameServer: string, logsUrl: string }>();

  get matchStarted() {
    return this._matchStarted.asObservable();
  }

  get matchEnded() {
    return this._matchEnded.asObservable();
  }

  get logsUploaded() {
    return this._logsUploaded.asObservable();
  }

  constructor(
    private configService: ConfigService,
    private gameRunnerManagerService: GameRunnerManagerService,
  ) {
    this.logReceiver = new LogReceiver({
      address: this.configService.logRelayAddress,
      port: parseInt(this.configService.logRelayPort, 10),
    });

    this.logger.log(`listening for incoming logs at ${this.logReceiver.opts.address}:${this.logReceiver.opts.port}`);

    this.logReceiver.on('data', (msg: LogMessage) => {
      if (msg.isValid) {
        this.logger.debug(msg.message);
        this.testForGameEvent(msg.message, msg.receivedFrom);
      }
    });
  }

  private testForGameEvent(message: string, source: GameEventSource) {
    if (message.match(/^[\d\/\s-:]+World triggered \"Round_Start\"$/)) {
      this.onMatchStarted(source);
    } else if (message.match(/^[\d\/\s-:]+World triggered \"Game_Over\" reason \".*\"$/)) {
      this.onMatchEnded(source);
    } else if (message.match(/^[\d\/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/)) {
      const matches = message.match(/^[\d\/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/);
      const logsUrl = `http://logs.tf/${matches[1]}`;
      this.onLogsUploaded(source, logsUrl);
    } else if (message.match(/^\w?\s?(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s\"(.[^\<]+)\<(\d+)\>\<\[(.[^\]]+)\]\>\<\>"\sconnected,\saddress\s\"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5})"$/)) {
      const matches = message.match(/^\w?\s?(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s\"(.[^\<]+)\<(\d+)\>\<\[(.[^\]]+)\]\>\<\>"\sconnected,\saddress\s\"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5})"$/);
      const steamId = new SteamID(`[${matches[5]}]`);
      if (steamId.isValid()) {
        this.onPlayerConnected(source, steamId.getSteamID64());
      }
    } else if (message.match(/^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s\"(.[^\<]+)\<(\d+)\>\<(\[.[^\]]+\])\>\<(.[^\>]+)\>\"\sdisconnected\s\(reason\s\"(.[^\"]+)\"\)$/)) {
      const matches = message.match(/^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s\"(.[^\<]+)\<(\d+)\>\<(\[.[^\]]+\])\>\<(.[^\>]+)\>\"\sdisconnected\s\(reason\s\"(.[^\"]+)\"\)$/);
      const steamId = new SteamID(matches[5]);
      if (steamId.isValid()) {
        this.onPlayerDisconnected(source, steamId.getSteamID64());
      }
    }
  }

  private onPlayerConnected(source: GameEventSource, steamId: string) {
    const gameRunner = this.gameRunnerManagerService.findGameRunnerByEventSource(`${source.address}:${source.port}`);
    gameRunner.onPlayerConnected(steamId);
  }

  private onPlayerDisconnected(source: GameEventSource, steamId: string) {
    const gameRunner = this.gameRunnerManagerService.findGameRunnerByEventSource(`${source.address}:${source.port}`);
    gameRunner.onPlayerDisconnected(steamId);
  }

  private async onMatchStarted(source: GameEventSource) {
    const gameRunner = this.gameRunnerManagerService.findGameRunnerByEventSource(`${source.address}:${source.port}`);
    gameRunner.onMatchStarted();
  }

  private async onMatchEnded(source: GameEventSource) {
    const gameRunner = this.gameRunnerManagerService.findGameRunnerByEventSource(`${source.address}:${source.port}`);
    gameRunner.onMatchEnded();
  }

  private async onLogsUploaded(source: GameEventSource, logsUrl: string) {
    const gameRunner = this.gameRunnerManagerService.findGameRunnerByEventSource(`${source.address}:${source.port}`);
    gameRunner.onLogsUploaded(logsUrl);
  }

}
