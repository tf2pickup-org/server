import { Injectable } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { PlayerBan } from '../models/player-ban';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';

@Injectable()
export class PlayerBansService {

  constructor(
    @InjectModel(PlayerBan) private playerBanModel: ReturnModelType<typeof PlayerBan>,
  ) { }

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
    // const playerId = addedBan.player.toString();
    // this.emit('player_banned', playerId);
    // this.onlinePlayersService.getSocketsForPlayer(addedBan.player.toString()).forEach(async socket => {
    //   const bans = await this.getActiveBansForPlayer(addedBan.player.toString());
    //   socket.emit('profile update', { bans });
    // });

    // this.discordService.notifyBan(addedBan);
    return addedBan;
  }

  async revokeBan(banId: string): Promise<DocumentType<PlayerBan>> {
    const ban = await this.playerBanModel.findById(banId);
    ban.end = new Date();
    await ban.save();

    // this.onlinePlayersService.getSocketsForPlayer(ban.player.toString()).forEach(async socket => {
    //   const bans = await this.getActiveBansForPlayer(ban.player.toString());
    //   socket.emit('profile update', { bans });
    // });

    return ban;
  }

}
