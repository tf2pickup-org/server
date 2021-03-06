import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { PlayerBan } from '../models/player-ban';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { merge } from 'rxjs';
import { OnlinePlayersService } from './online-players.service';
import { PlayersService } from './players.service';
import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';

@Injectable()
export class PlayerBansService implements OnModuleInit {

  private logger = new Logger(PlayerBansService.name);

  constructor(
    @InjectModel(PlayerBan) private playerBanModel: ReturnModelType<typeof PlayerBan>,
    private onlinePlayersService: OnlinePlayersService,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private environment: Environment,
    private events: Events,
  ) { }

  onModuleInit() {
    merge(
      this.events.playerBanAdded,
      this.events.playerBanRevoked,
    ).subscribe(async ({ ban }) => {
      const playerId = ban.player.toString();
      const bans = await this.getPlayerActiveBans(playerId);
      this.onlinePlayersService.getSocketsForPlayer(playerId).forEach(socket => socket.emit('profile update', { bans }));
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
    this.events.playerBanAdded.next({ ban: addedBan });
    return addedBan;
  }

  async revokeBan(banId: string, adminId: string): Promise<DocumentType<PlayerBan>> {
    const admin = await this.playersService.getById(adminId);
    if (!admin) {
      throw new Error('this admin does not exist');
    }

    const ban = await this.playerBanModel.findById(banId);
    if (ban.end < new Date()) {
      throw new Error('this ban has already expired');
    }

    ban.end = new Date();
    await ban.save();

    const player = await this.playersService.getById(ban.player.toString());
    this.logger.verbose(`ban revoked for player ${player.id}`);
    this.events.playerBanRevoked.next({ ban });
    return ban;
  }

}
