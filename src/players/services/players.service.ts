import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { Environment } from '@/environment/environment';
import { Player } from '../models/player';
import { ReturnModelType } from '@typegoose/typegoose';
import { SteamProfile } from '../models/steam-profile';
import { Etf2lProfileService } from './etf2l-profile.service';
import { InjectModel } from 'nestjs-typegoose';
import { GamesService } from '@/games/services/games.service';
import { PlayerStats } from '../models/player-stats';
import { Etf2lProfile } from '../models/etf2l-profile';
import { OnlinePlayersService } from './online-players.service';
import { SteamApiService } from './steam-api.service';
import { TwitchTvUser } from '../models/twitch-tv-user';
import { DiscordService } from '@/discord/services/discord.service';
import { newPlayer, playerNameChanged } from '@/discord/notifications';
import { ObjectId } from 'mongodb';
import { minimumTf2InGameHours, requireEtf2lAccount } from '@configs/players';
import { PlayerAvatar } from '../models/player-avatar';
import { Events } from '@/events/events';
import { deepDiff } from '@/utils/deep-diff';

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
    private discordService: DiscordService,
    private events: Events,
  ) { }

  async onModuleInit() {
    const bot = await this.findBot();
    if (bot === null) {
      await this.playerModel.create({
        name: this.environment.botName,
        role: 'bot',
      })
    }
  }

  async getAll(): Promise<Player[]> {
    return await this.playerModel.find({ role: { $ne: 'bot' } }).lean().exec();
  }

  async getById(id: string | ObjectId): Promise<Player> {
    return await this.playerModel.findById(id).lean().exec();
  }

  async findBySteamId(steamId: string): Promise<Player> {
    return await this.playerModel.findOne({ steamId }).lean().exec();
  }

  async findByEtf2lProfileId(etf2lProfileId: number): Promise<Player> {
    return await this.playerModel.findOne({ etf2lProfileId }).lean().exec();
  }

  async findByTwitchUserId(twitchTvUserId: string): Promise<Player> {
    return await this.playerModel.findOne({ 'twitchTvUser.userId': twitchTvUserId }).lean().exec();
  }

  async findBot(): Promise<Player> {
    return this.playerModel.findOne({ name: this.environment.botName }).lean().exec();
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

    const player = await this.playerModel.create({
      steamId: steamProfile.id,
      name,
      avatar,
      role: this.environment.superUser === steamProfile.id ? 'super-user' : null,
      etf2lProfileId: etf2lProfile?.id,
      hasAcceptedRules: false,
    });

    this.logger.verbose(`created new player (name: ${player?.name})`);
    this.events.playerRegisters.next({ player });

    this.discordService.getAdminsChannel()?.send({
      embed: newPlayer({
        name: player.name,
        profileUrl: `${this.environment.clientUrl}/player/${player.id}`,
      }),
    });

    return player.toObject();
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

    const player = await this.playerModel.create({
      etf2lProfileId: etf2lProfile?.id,
      ...playerData,
    });
    this.logger.verbose(`created new player (name: ${player.name})`);
    this.events.playerRegisters.next({ player });
    this.discordService.getAdminsChannel()?.send({
      embed: newPlayer({
        name: player.name,
        profileUrl: `${this.environment.clientUrl}/player/${player.id}`,
      }),
    });
    return player.toObject();
  }

  async registerTwitchAccount(playerId: string, twitchTvUser: TwitchTvUser) {
    return await this.updatePlayer(playerId, { twitchTvUser });
  }

  async getUsersWithTwitchTvAccount(): Promise<Player[]> {
    return await this.playerModel.find({ twitchTvUser: { $exists: true } }).lean().exec();
  }

  async updatePlayer(playerId: string, update: Partial<Player>, adminId?: string): Promise<Player> {
    const oldPlayer = await this.getById(playerId);
    if (oldPlayer) {
      const newPlayer = await this.playerModel.findOneAndUpdate({ _id: playerId }, update, { new: true }).lean().exec();

      if (adminId && update.name && oldPlayer.name !== newPlayer.name) {
        const admin = await this.getById(adminId);
        if (!admin)  {
          throw new Error('admin does not exist');
        }

        this.discordService.getAdminsChannel()?.send({
          embed: playerNameChanged({
            oldName: oldPlayer.name,
            newName: newPlayer.name,
            profileUrl: `${this.environment.clientUrl}/player/${newPlayer._id}`,
            adminResponsible: admin.name,
          }),
        });
      }

      this.onlinePlayersService.getSocketsForPlayer(playerId).forEach(socket => socket.emit('profile update', deepDiff(newPlayer, oldPlayer)));

      return newPlayer;
    } else {
      throw new Error('no such player');
    }
  }

  /**
   * Player accepts the rules.
   * Without accepting the rules, player cannot join the queue nor any game.
   */
  async acceptTerms(playerId: string): Promise<Player> {
    return await this.updatePlayer(playerId, { hasAcceptedRules: true });
  }

  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const gamesPlayed = await this.gamesService.getPlayerGameCount(playerId, { endedOnly: true });
    const classesPlayed = await this.gamesService.getPlayerPlayedClassCount(playerId);
    return { player: playerId, gamesPlayed, classesPlayed };
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
