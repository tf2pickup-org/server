import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { PlayerBan } from '../models/player-ban';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { Subject, merge } from 'rxjs';
import { OnlinePlayersService } from './online-players.service';
import { playerBanAdded, playerBanRevoked } from '@/discord/notifications';
import { PlayersService } from './players.service';
import { Environment } from '@/environment/environment';
import { DiscordService } from '@/discord/services/discord.service';

@Injectable()
export class PlayerBansService implements OnModuleInit {

  private logger = new Logger(PlayerBansService.name);
  private _banAdded = new Subject<string>();
  private _banRevoked = new Subject<string>();

  get banAdded() {
    return this._banAdded.asObservable();
  }

  get banRevoked() {
    return this._banRevoked.asObservable();
  }

  constructor(
    @InjectModel(PlayerBan) private playerBanModel: ReturnModelType<typeof PlayerBan>,
    private onlinePlayersService: OnlinePlayersService,
    private discordService: DiscordService,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private environment: Environment,
  ) { }

  onModuleInit() {
    merge(
      this.banAdded,
      this.banRevoked,
    ).subscribe(playerId => {
      this.onlinePlayersService.getSocketsForPlayer(playerId).forEach(async socket => {
        const bans = await this.getPlayerActiveBans(playerId);
        socket.emit('profile update', { bans });
      });
    });
  }

  async getById(banId: string): Promise<DocumentType<PlayerBan>> {
    return await this.playerBanModel.findById(banId);
  }

  async getPlayerBans(playerId: string) {
    return await this.playerBanModel.find({ player: playerId }).sort({ start: -1 });
  }

  async getPlayerActiveBans(playerId: string) {
    return await this.playerBanModel.find({
      player: playerId,
      end: {
        $gte: new Date(),
      },
    });
  }

  async addPlayerBan(playerBan: PlayerBan): Promise<DocumentType<PlayerBan>> {
    const [ admin, player ] = await Promise.all([
      await this.playersService.getById(playerBan.admin.toString()),
      await this.playersService.getById(playerBan.player.toString()),
    ]);

    if (!admin) {
      throw new Error('admin does not exist');
    }

    if (!player) {
      throw new Error('player does not exist');
    }

    const addedBan = await this.playerBanModel.create(playerBan);

    this.logger.verbose(`ban added for player ${player.id} (reason: ${playerBan.reason})`);
    this._banAdded.next(player.id);

    this.discordService.getAdminsChannel()?.send(playerBanAdded({
      admin: admin.name,
      player: player.name,
      reason: addedBan.reason,
      ends: addedBan.end,
      playerProfileUrl: `${this.environment.clientUrl}/player/${player.id}`,
    }));

    return addedBan;
  }

  async revokeBan(banId: string, adminId: string): Promise<DocumentType<PlayerBan>> {
    const admin = await this.playersService.getById(adminId);
    if (!admin) {
      throw new Error('this admin does not exist');
    }

    const ban = await this.playerBanModel.findById(banId);

    if (ban.end < new Date()) {
      throw new Error('this ban is already expired');
    }

    ban.end = new Date();
    await ban.save();

    const player = await this.playersService.getById(ban.player.toString());
    this.logger.verbose(`ban revoked for player ${player.id}`);
    this._banRevoked.next(player.id);

    this.discordService.getAdminsChannel()?.send(playerBanRevoked({
      player: player.name,
      reason: ban.reason,
      playerProfileUrl: `${this.environment.clientUrl}/player/${player.id}`,
      adminResponsible: admin.name,
    }));

    return ban;
  }

}
