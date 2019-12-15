import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import { Player } from '../models/player';
import { DocumentType, ReturnModelType } from '@typegoose/typegoose';
import { SteamProfile } from '../models/steam-profile';
import { Etf2lProfileService } from './etf2l-profile.service';
import { InjectModel } from 'nestjs-typegoose';

@Injectable()
export class PlayersService {

  private logger = new Logger(PlayersService.name);

  constructor(
    private configService: ConfigService,
    private etf2lProfileService: Etf2lProfileService,
    @InjectModel(Player) private playerModel: ReturnModelType<typeof Player>,
  ) { }

  async getAll(): Promise<Array<DocumentType<Player>>> {
    return await this.playerModel.find();
  }

  async getById(id: string): Promise<DocumentType<Player>> {
    return await this.playerModel.findById(id);
  }

  async findBySteamId(steamId: string): Promise<DocumentType<Player>> {
    return await this.playerModel.findOne({ steamId });
  }

  async createPlayer(steamProfile: SteamProfile): Promise<DocumentType<Player>> {
    const etf2lProfile = await this.etf2lProfileService.fetchPlayerInfo(steamProfile.id);
    if (etf2lProfile.bans && etf2lProfile.bans.filter(ban => ban.end > Date.now()).length > 0) {
      throw new Error('this account is banned on ETF2L');
    }

    const player = await this.playerModel.create({
      steamId: steamProfile.id,
      name: etf2lProfile.name,
      avatarUrl: steamProfile.photos[0].value,
      role: this.configService.superUser === steamProfile.id ? 'super-user' : null,
      etf2lProfileId: etf2lProfile.id,
    });

    this.logger.log(`created new player (name: ${player?.name})`);
    return player;
  }

  /**
   * Player accepts the rules.
   * Without accepting the rules, player cannot join the queue nor any game.
   */
  async acceptTerms(playerId: string): Promise<DocumentType<Player>> {
    const player = await this.getById(playerId);
    if (!player) {
      throw new Error('no such player');
    }

    player.hasAcceptedRules = true;
    await player.save();
    return player;
  }

}
