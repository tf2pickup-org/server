import { ServerConfiguratorService } from './services/server-configurator.service';
import { DocumentType } from '@typegoose/typegoose';
import { Game } from './models/game';
import { Subject } from 'rxjs';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { GameServer } from '@/game-servers/models/game-server';
import { Logger } from '@nestjs/common';
import { GamesService } from './services/games.service';
import { PlayersService } from '@/players/services/players.service';
import { Environment } from '@/environment/environment';

export class GameRunner {

  private logger = new Logger(`game ${this.gameId}`);
  private _gameInitialized = new Subject<void>();
  private _gameFinished = new Subject<void>();
  private _gameUpdated = new Subject<void>();

  game: DocumentType<Game>;
  gameServer: DocumentType<GameServer>;

  get gameInitialized() {
    return this._gameInitialized.asObservable();
  }

  /**
   * Note: this is different than the 'ended' state of game. A finished game means the game can no longer
   * receive any updates. The gameserver has been cleaned up, so no logs will be captured by this game runner
   * instance.
   *
   * @readonly
   * @memberof GameRunner
   */
  get gameFinished() {
    return this._gameFinished.asObservable();
  }

  get gameUpdated() {
    return this._gameUpdated.asObservable();
  }

  constructor(
    public gameId: string,
    private gamesService: GamesService,
    private gameServersService: GameServersService,
    private environment: Environment,
    private serverConfiguratorService: ServerConfiguratorService,
    private playersService: PlayersService,
  ) { }

  async initialize() {
    this.game = await this.gamesService.getById(this.gameId);
    this.logger.setContext(`game #${this.game.number}`);

    if (this.game.state === 'ended' || this.game.state === 'interrupted') {
      this.logger.warn('launching a game that has already been ended');
    }

    if (this.game.gameServer) {
      this.gameServer = await this.gameServersService.getById(this.game?.gameServer?.toString());
      this.logger.setContext(`${this.gameServer.name}/#${this.game.number}`);
      this._gameInitialized.next();
      this.logger.log('game resurrected');
    } else {
      const server = await this.gameServersService.findFreeGameServer();
      if (server) {
        this.gameServer = server;
        this.logger.setContext(`${this.gameServer.name}/#${this.game.number}`);
        await this.assignGameServer(server);
        await this.resolveMumbleUrl(server);
        this._gameUpdated.next();
        this._gameInitialized.next();
        this.logger.log('game initialized');
        //
        // todo: error handling
        //
      } else {
        this.logger.warn(`no free servers available`);
        //
        // todo: handle
        //
      }
    }
  }

  async launch() {
    this.logger.verbose('launch');
    const { connectString } = await this.serverConfiguratorService.configureServer(this.gameServer, this.game);
    await this.updateConnectString(connectString);
  }

  async reconfigure() {
    this.logger.verbose('reconfigure');
    await this.updateConnectString(null);
    const { connectString } = await this.serverConfiguratorService.configureServer(this.gameServer, this.game);
    await this.updateConnectString(connectString);
  }

  async forceEnd() {
    this.logger.verbose('force end');
    this.game.state = 'interrupted';
    this.game.error = 'ended by admin';
    this.game.save();
    this._gameUpdated.next();

    await this.serverConfiguratorService.cleanupServer(this.gameServer);
    await this.gameServersService.releaseServer(this.gameServer.id);
  }

  async onPlayerConnected(steamId: string) {
    const player = await this.playersService.findBySteamId(steamId);
    this.logger.verbose(`${player.name} connected`);
  }

  async onPlayerDisconnected(steamId: string) {
    const player = await this.playersService.findBySteamId(steamId);
    this.logger.verbose(`${player.name} disconnected`);
  }

  async onMatchStarted() {
    this.game.state = 'started';
    await this.game.save();
    this._gameUpdated.next();
  }

  async onMatchEnded() {
    this.game.state = 'ended';
    await this.game.save();
    this._gameUpdated.next();
  }

  async onLogsUploaded(logsUrl: string) {
    this.game.logsUrl = logsUrl;
    await this.game.save();
    this._gameUpdated.next();
  }

  private async assignGameServer(server: DocumentType<GameServer>) {
    this.logger.log(`using server ${server.name}`);
    await this.gameServersService.takeServer(server.id);
    this.game.gameServer = server;
    await this.game.save();
  }

  private async resolveMumbleUrl(server: GameServer) {
    const mumbleUrl =
      `mumble://${this.environment.mumbleServerUrl}/${this.environment.mumbleChannelName}/${server.mumbleChannelName}`;
    this.game.mumbleUrl = mumbleUrl;
    await this.game.save();
  }

  private async updateConnectString(connectString: string) {
    this.game.connectString = connectString;
    await this.game.save();
    this._gameUpdated.next();
  }

}
