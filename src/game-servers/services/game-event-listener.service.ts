import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import { LogReceiver, LogMessage } from 'srcds-log-receiver';
import { GameServersService } from './game-servers.service';
import { Subject } from 'rxjs';
import { GameServer } from '../models/game-server';

export interface GameEventSource {
  address: string;
  port: number;
}

@Injectable()
export class GameEventListenerService {

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
    private gameServersService: GameServersService,
  ) {
    this.logReceiver = new LogReceiver({
      address: this.configService.logRelayAddress,
      port: parseInt(this.configService.logRelayPort, 10),
    });

    this.logReceiver.on('data', (msg: LogMessage) => {
      if (msg.isValid) {
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
    }
  }

  private async onMatchStarted(source: GameEventSource) {
    const server = await this.gameServersService.getGameServerByEventSource(source);
    if (server) {
      this._matchStarted.next(server.id);
    }
  }

  private async onMatchEnded(source: GameEventSource) {
    const server = await this.gameServersService.getGameServerByEventSource(source);
    if (server) {
      this._matchEnded.next(server.id);
    }
  }

  private async onLogsUploaded(source: GameEventSource, logsUrl: string) {
    const server = await this.gameServersService.getGameServerByEventSource(source);
    if (server) {
      this._logsUploaded.next({ gameServer: server.id, logsUrl });
    }
  }

}
