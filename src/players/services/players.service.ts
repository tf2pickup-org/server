import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { Environment } from '@/environment/environment';
import { Player } from '../models/player';
import { mongoose, ReturnModelType } from '@typegoose/typegoose';
import { SteamProfile } from '../steam-profile';
import { Etf2lProfileService } from './etf2l-profile.service';
import { InjectModel } from 'nestjs-typegoose';
import { GamesService } from '@/games/services/games.service';
import { PlayerStats } from '../dto/player-stats';
import { Etf2lProfile } from '../etf2l-profile';
import { OnlinePlayersService } from './online-players.service';
import { SteamApiService } from './steam-api.service';
import { TwitchTvUser } from '../models/twitch-tv-user';
import { ObjectId } from 'mongodb';
import { minimumTf2InGameHours, requireEtf2lAccount } from '@configs/players';
import { PlayerAvatar } from '../models/player-avatar';
import { Events } from '@/events/events';
import { classToPlain, plainToClass } from 'class-transformer';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

type ForceCreatePlayerOptions = Pick<Player, 'steamId' | 'name'>;

@Injectable()
export class PlayersService implements OnModuleInit {

  private logger = new Logger(PlayersService.name);

  constructor(
    private environment: Environment,
    private etf2lProfileService: Etf2lProfileService,
    @InjectModel(Player) private playerModel: ReturnModelType<typeof Player>,
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    private onlinePlayersService: OnlinePlayersService,
    private steamApiService: SteamApiService,
    private events: Events,
  ) { }

  async onModuleInit() {
    try {
      await this.findBot();
    } catch (error) {
      if (error instanceof mongoose.Error.DocumentNotFoundError) {
        await this.playerModel.create({
          name: this.environment.botName,
          role: 'bot',
        });
      } else {
        throw error;
      }
    }
  }

  async getAll(): Promise<Player[]> {
    return plainToClass(Player, await this.playerModel.find({ role: { $ne: 'bot' } }).lean().exec());
  }

  async getById(id: string | ObjectId): Promise<Player> {
    return plainToClass(Player, await this.playerModel.findById(id).orFail().lean().exec());
  }

  async findBySteamId(steamId: string): Promise<Player> {
    return plainToClass(Player, await this.playerModel.findOne({ steamId }).orFail().lean().exec());
  }

  async findByEtf2lProfileId(etf2lProfileId: number): Promise<Player> {
    return plainToClass(Player, await this.playerModel.findOne({ etf2lProfileId }).orFail().lean().exec());
  }

  async findByTwitchUserId(twitchTvUserId: string): Promise<Player> {
    return plainToClass(Player, await this.playerModel.findOne({ 'twitchTvUser.userId': twitchTvUserId }).orFail().lean().exec());
  }

  async findBot(): Promise<Player> {
    return plainToClass(Player, this.playerModel.findOne({ name: this.environment.botName }).orFail().lean().exec());
  }

  async createPlayer(steamProfile: SteamProfile): Promise<Player> {
    await this.verifyTf2InGameHours(steamProfile.id);

    let etf2lProfile: Etf2lProfile;
    let name = steamProfile.displayName;

    try {
      etf2lProfile = await this.etf2lProfileService.fetchPlayerInfo(steamProfile.id);

      if (etf2lProfile.bans?.filter(ban => ban.end > Date.now() / 1000).length > 0) {
        throw new Error('this account is banned on ETF2L');
      }

      name = etf2lProfile.name;
    } catch (error) {
      if (requireEtf2lAccount) {
        throw error;
      }
    }

    const avatar: PlayerAvatar = {
      small: steamProfile.photos[0].value,
      medium: steamProfile.photos[1].value,
      large: steamProfile.photos[2].value,
    };

    const id = (await this.playerModel.create({
      steamId: steamProfile.id,
      name,
      avatar,
      role: this.environment.superUser === steamProfile.id ? 'super-user' : null,
      etf2lProfileId: etf2lProfile?.id,
      hasAcceptedRules: false,
    }))._id;

    const player = await this.getById(id);
    this.logger.verbose(`created new player (name: ${player?.name})`);
    this.events.playerRegisters.next({ player });
    return player;
  }

  /**
   * Create player account, omitting all checks.
   */
  async forceCreatePlayer(playerData: ForceCreatePlayerOptions): Promise<Player> {
    let etf2lProfile: Etf2lProfile;
    try {
      etf2lProfile = await this.etf2lProfileService.fetchPlayerInfo(playerData.steamId);
    // eslint-disable-next-line no-empty
    } catch (error) { }

    const id = (await this.playerModel.create({
      etf2lProfileId: etf2lProfile?.id,
      ...playerData,
    }))._id;
    const player = await this.getById(id);
    this.logger.verbose(`created new player (name: ${player.name})`);
    this.events.playerRegisters.next({ player });
    return player;
  }

  async registerTwitchAccount(playerId: string, twitchTvUser: TwitchTvUser): Promise<Player> {
    return this.updatePlayer(playerId, { twitchTvUser });
  }

  async getUsersWithTwitchTvAccount(): Promise<Player[]> {
    return plainToClass(Player, await this.playerModel.find({ twitchTvUser: { $exists: true } }).lean().exec());
  }

  async updatePlayer(playerId: string, update: Partial<Player>, adminId?: string): Promise<Player> {
    const oldPlayer = await this.getById(playerId);
    const newPlayer = plainToClass(Player, await this.playerModel.findOneAndUpdate({ _id: playerId }, update, { new: true }).lean().exec());
    this.onlinePlayersService.getSocketsForPlayer(playerId).forEach(socket => socket.emit('profile update', classToPlain(newPlayer)));
    this.events.playerUpdates.next({ oldPlayer, newPlayer, adminId });
    return newPlayer;
  }

  /**
   * Player accepts the rules.
   * Without accepting the rules, player cannot join the queue nor any game.
   */
  async acceptTerms(playerId: string): Promise<Player> {
    return this.updatePlayer(playerId, { hasAcceptedRules: true });
  }

  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    return new PlayerStats({
      player: playerId,
      gamesPlayed: await this.gamesService.getPlayerGameCount(playerId, { endedOnly: true }),
      classesPlayed: new Map(Object.entries(await this.gamesService.getPlayerPlayedClassCount(playerId))) as Map<Tf2ClassName, number>,
    });
  }

  private async verifyTf2InGameHours(steamId: string) {
    try {
      const hoursInTf2 = await this.steamApiService.getTf2InGameHours(steamId);
      if (hoursInTf2 < minimumTf2InGameHours) {
        throw new Error('not enough tf2 hours');
      }
    } catch (e) {
      if (e.message === 'cannot verify in-game hours for TF2' && minimumTf2InGameHours <= 0) {
        return;
      } else {
        throw e;
      }
    }
  }

}
