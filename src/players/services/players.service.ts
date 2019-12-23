import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import { Player } from '../models/player';
import { DocumentType, ReturnModelType } from '@typegoose/typegoose';
import { SteamProfile } from '../models/steam-profile';
import { Etf2lProfileService } from './etf2l-profile.service';
import { InjectModel } from 'nestjs-typegoose';
import { GamesService } from '@/games/services/games.service';
import { PlayerStats } from '../models/player-stats';
import { Etf2lProfile } from '../models/etf2l-profile';

@Injectable()
export class PlayersService {

  private logger = new Logger(PlayersService.name);

  constructor(
    private configService: ConfigService,
    private etf2lProfileService: Etf2lProfileService,
    @InjectModel(Player) private playerModel: ReturnModelType<typeof Player>,
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
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
    let etf2lProfile: Etf2lProfile;
    let name = steamProfile.displayName;

    try {
      etf2lProfile = await this.etf2lProfileService.fetchPlayerInfo(steamProfile.id);

      if (etf2lProfile.bans && etf2lProfile.bans.filter(ban => ban.end > Date.now()).length > 0) {
        throw new Error('this account is banned on ETF2L');
      }

      name = etf2lProfile.name;
    } catch (error) {
      switch (error.message) {
        case 'no etf2l profile':
          if (this.configService.requireEtf2lAccount === 'true') {
            throw error;
          }
          break;

        default:
          throw error;
      }
    }

    const player = await this.playerModel.create({
      steamId: steamProfile.id,
      name,
      avatarUrl: steamProfile.photos[0].value,
      role: this.configService.superUser === steamProfile.id ? 'super-user' : null,
      etf2lProfileId: etf2lProfile?.id,
    });

    this.logger.log(`created new player (name: ${player?.name})`);
    return player;
  }

  async updatePlayer(playerId: string, update: Partial<Player>): Promise<DocumentType<Player>> {
    const player = await this.getById(playerId);
    if (player) {
      if (update.name) {
        player.name = update.name;
      }

      return await player.save();
    } else {
      return null;
    }
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

  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const gamesPlayed = await this.gamesService.getPlayerGameCount(playerId, { endedOnly: true });
    const classesPlayed = await this.gamesService.getPlayerPlayedClassCount(playerId);
    return { player: playerId, gamesPlayed, classesPlayed };
  }

}
