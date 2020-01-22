import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { PlayerBan } from '../models/player-ban';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { Subject, merge } from 'rxjs';
import { OnlinePlayersService } from './online-players.service';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';

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
    private discordNotificationsService: DiscordNotificationsService,
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

  async getById(banId: string): Promise<PlayerBan> {
    return await this.playerBanModel.findById(banId);
  }

  async getPlayerBans(playerId: string): Promise<PlayerBan[]> {
    return await this.playerBanModel.find({ player: playerId }).sort({ start: -1 });
  }

  async getPlayerActiveBans(playerId: string): Promise<PlayerBan[]> {
    return await this.playerBanModel.find({
      player: playerId,
      end: {
        $gte: new Date(),
      },
    });
  }

  async addPlayerBan(playerBan: Partial<PlayerBan>): Promise<DocumentType<PlayerBan>> {
    const addedBan = await this.playerBanModel.create(playerBan);
    const playerId = addedBan.player.toString();
    this._banAdded.next(playerId);
    this.logger.verbose(`ban added for player ${playerId} (reason: ${playerBan.reason})`);
    this.discordNotificationsService.notifyBanAdded(addedBan);
    return addedBan;
  }

  async revokeBan(banId: string): Promise<DocumentType<PlayerBan>> {
    const ban = await this.playerBanModel.findById(banId);
    ban.end = new Date();
    await ban.save();

    const playerId = ban.player.toString();
    this._banRevoked.next(playerId);
    this.logger.verbose(`ban revoked for player ${playerId}`);
    this.discordNotificationsService.notifyBanRevoked(ban);
    return ban;
  }

}
