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
import { PlayerConnectionStatus } from './models/player-connection-status';
import { GamePlayer } from './models/game-player';
import { RconFactoryService } from './services/rcon-factory.service';

export class GameRunner {

  game: DocumentType<Game>;
  gameServer: DocumentType<GameServer>;

  private logger = new Logger(`game ${this.gameId}`);
  private _gameInitialized = new Subject<void>();
  private _gameFinished = new Subject<void>();
  private _gameUpdated = new Subject<void>();

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
    public readonly gameId: string,
    private gamesService: GamesService,
    private gameServersService: GameServersService,
    private environment: Environment,
    private serverConfiguratorService: ServerConfiguratorService,
    private playersService: PlayersService,
    private rconFactoryService: RconFactoryService,
  ) { }

  async initialize() {
    this.game = await this.gamesService.getById(this.gameId);
    this.logger.setContext(`game #${this.game.number}`);

    if (this.game.state === 'ended' || this.game.state === 'interrupted') {
      this.logger.warn('launching a game that has already been ended');
    }

    if (this.game.gameServer) {
      this.gameServer = await this.gameServersService.getById(this.game.gameServer.toString());
    }

    if (this.gameServer) {
      this.logger.setContext(`${this.gameServer.name}/#${this.game.number}`);
      this._gameInitialized.next();
      this.logger.log('game resurrected');
    } else {
      await this.assignFreeServer();
    }
  }

  async launch() {
    this.logger.verbose('launch');
    if (!this.game || !this.gameServer) {
      throw new Error('not initialized');
    }

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

  async replacePlayer(replaceeId: string, replacementSlot: GamePlayer) {
    await this.refreshGame();
    const player = await this.playersService.getById(replacementSlot.playerId);
    const team = parseInt(replacementSlot.teamId, 10) + 2;

    const rcon = await this.rconFactoryService.createRcon(this.gameServer);

    const cmd = [
      `sm_game_player_add ${player.steamId}`,
      `-name "${player.name}"`,
      `-team ${team}`,
      `-class ${replacementSlot.gameClass}`,
    ].join(' ');
    this.logger.debug(cmd);
    await rcon.send(cmd);

    const replacee = await this.playersService.getById(replaceeId);
    const cmd2 = `sm_game_player_del ${replacee?.steamId}`;
    this.logger.debug(cmd2);
    await rcon.send(cmd2);
    await rcon.end();
  }

  async onPlayerJoining(steamId: string) {
    const player = await this.playersService.findBySteamId(steamId);
    this.logger.verbose(`${player.name} is joining the server`);
    await this.setPlayerConnectionStatus(player.id, 'joining');
  }

  async onPlayerConnected(steamId: string) {
    const player = await this.playersService.findBySteamId(steamId);
    this.logger.verbose(`${player.name} connected`);
    await this.setPlayerConnectionStatus(player.id, 'connected');
  }

  async onPlayerDisconnected(steamId: string) {
    const player = await this.playersService.findBySteamId(steamId);
    this.logger.verbose(`${player.name} disconnected`);
    await this.setPlayerConnectionStatus(player.id, 'offline');
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

  private async assignFreeServer() {
    const server = await this.gameServersService.findFreeGameServer();
    if (server) {
      this.logger.setContext(`${server.name}/#${this.game.number}`);
      this.logger.verbose(`using server ${server.name}`);

      await this.gameServersService.takeServer(server.id);
      this.gameServer = server;
      this.game.gameServer = server;

      const mumbleUrl = `mumble://${this.environment.mumbleServerUrl}/${this.environment.mumbleChannelName}/${server.mumbleChannelName}`;
      this.logger.verbose(`mumble url=${mumbleUrl}`);
      this.game.mumbleUrl = mumbleUrl;

      await this.game.save();
      this._gameUpdated.next();
      this._gameInitialized.next();
      this.logger.verbose('initialized');
    } else {
      this.logger.warn(`no free servers available`);
      //
      // todo: handle
      //
    }
  }

  private async updateConnectString(connectString: string) {
    this.game.connectString = connectString;
    await this.game.save();
    this._gameUpdated.next();
  }

  private async setPlayerConnectionStatus(playerId: string, connectionStatus: PlayerConnectionStatus) {
    const slot = this.game.slots.find(s => s.playerId === playerId);
    if (slot) {
      slot.connectionStatus = connectionStatus;
      await this.game.save();
      this._gameUpdated.next();
    } else {
      this.logger.warn(`player ${playerId} does not belong in this game`);
    }
  }

  private async refreshGame() {
    this.game = await this.gamesService.getById(this.game.id);
  }

}
