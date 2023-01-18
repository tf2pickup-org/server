import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  OnModuleInit,
} from '@nestjs/common';
import { Environment } from '@/environment/environment';
import { Player, PlayerDocument } from '../models/player';
import { SteamProfile } from '../steam-profile';
import { Etf2lProfileService } from './etf2l-profile.service';
import { GamesService } from '@/games/services/games.service';
import { Etf2lProfile } from '../etf2l-profile';
import { SteamApiService } from './steam-api.service';
import { PlayerAvatar } from '../models/player-avatar';
import { Events } from '@/events/events';
import { plainToInstance } from 'class-transformer';
import { Error, FilterQuery, Model, Types, UpdateQuery } from 'mongoose';
import { AccountBannedError } from '../errors/account-banned.error';
import { InsufficientTf2InGameHoursError } from '../errors/insufficient-tf2-in-game-hours.error';
import { PlayerRole } from '../models/player-role';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { InjectModel } from '@nestjs/mongoose';
import { Mutex } from 'async-mutex';

interface ForceCreatePlayerOptions {
  name: Player['name'];
  steamId: Player['steamId'];
  roles?: Player['roles'];
}

@Injectable()
export class PlayersService implements OnModuleInit {
  private readonly logger = new Logger(PlayersService.name);
  private readonly mutex = new Mutex();

  constructor(
    private environment: Environment,
    private etf2lProfileService: Etf2lProfileService,
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    private steamApiService: SteamApiService,
    private events: Events,
    private configurationService: ConfigurationService,
  ) {}

  async onModuleInit() {
    try {
      await this.findBot();
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        await this.playerModel.create({
          name: this.environment.botName,
          roles: [PlayerRole.bot],
        });
      } else {
        throw error;
      }
    }

    await this.releaseAllPlayers();
  }

  async getAll(): Promise<Player[]> {
    return plainToInstance(
      Player,
      await this.playerModel
        .find({ roles: { $ne: PlayerRole.bot } })
        .lean()
        .exec(),
    );
  }

  async getById(id: string | Types.ObjectId): Promise<Player> {
    return plainToInstance(
      Player,
      await this.playerModel.findById(id).orFail().lean().exec(),
    );
  }

  async getManyById(...ids: string[]): Promise<Player[]> {
    return plainToInstance(
      Player,
      await this.playerModel
        .find({
          _id: {
            $in: ids.map((id) => new Types.ObjectId(id)),
          },
        })
        .lean()
        .exec(),
    );
  }

  async find(query: FilterQuery<Player>): Promise<Player[]> {
    return plainToInstance(
      Player,
      await this.playerModel.find(query).lean().exec(),
    );
  }

  async findBySteamId(steamId: string): Promise<Player> {
    return plainToInstance(
      Player,
      await this.playerModel.findOne({ steamId }).orFail().lean().exec(),
    );
  }

  async findByEtf2lProfileId(etf2lProfileId: number): Promise<Player> {
    return plainToInstance(
      Player,
      await this.playerModel.findOne({ etf2lProfileId }).orFail().lean().exec(),
    );
  }

  async findBot(): Promise<Player> {
    return plainToInstance(
      Player,
      await this.playerModel
        .findOne({ name: this.environment.botName })
        .orFail()
        .lean()
        .exec(),
    );
  }

  async createPlayer(steamProfile: SteamProfile): Promise<Player> {
    const superUserId = this.environment.superUser;

    if (steamProfile.id === superUserId) {
      return await this.forceCreatePlayer({
        name: steamProfile.displayName,
        steamId: steamProfile.id,
        roles: [PlayerRole.superUser, PlayerRole.admin],
      });
    }

    await this.verifyTf2InGameHours(steamProfile.id);

    let etf2lProfile: Etf2lProfile | undefined;
    let name = steamProfile.displayName;

    const { value: isEtf2lAccountRequired } =
      await this.configurationService.isEtf2lAccountRequired();

    if (isEtf2lAccountRequired) {
      etf2lProfile = await this.etf2lProfileService.fetchPlayerInfo(
        steamProfile.id,
      );

      if (
        (etf2lProfile.bans?.filter((ban) => ban.end > Date.now() / 1000)
          .length ?? 0) > 0
      ) {
        throw new AccountBannedError(steamProfile.id);
      }

      name = etf2lProfile.name;
    }

    const avatar: PlayerAvatar = {
      small: steamProfile.photos[0].value,
      medium: steamProfile.photos[1].value,
      large: steamProfile.photos[2].value,
    };

    const { _id: id } = await this.playerModel.create({
      name,
      avatar,
      steamId: steamProfile.id,
      etf2lProfileId: etf2lProfile?.id,
      hasAcceptedRules: false,
    });

    const player = await this.getById(id);
    this.logger.verbose(`created new player (name: ${player?.name})`);
    this.events.playerRegisters.next({ player });
    return player;
  }

  /**
   * Create player account, omitting all checks.
   */
  async forceCreatePlayer(
    playerData: ForceCreatePlayerOptions,
  ): Promise<Player> {
    const etf2lProfile: Etf2lProfile | undefined =
      await this.etf2lProfileService
        .fetchPlayerInfo(playerData.steamId)
        .catch(() => undefined);

    const { id } = await this.playerModel.create({
      etf2lProfileId: etf2lProfile?.id,
      ...playerData,
    });

    const player = await this.getById(id);
    this.logger.verbose(`created new player (name: ${player.name})`);
    this.events.playerRegisters.next({ player });
    return player;
  }

  async updatePlayer(
    playerId: string,
    update: UpdateQuery<Player>,
    adminId?: string,
  ): Promise<Player> {
    return await this.mutex.runExclusive(async () => {
      const oldPlayer = await this.getById(playerId);
      const newPlayer = plainToInstance(
        Player,
        await this.playerModel
          .findByIdAndUpdate(playerId, update, { new: true })
          .orFail()
          .lean()
          .exec(),
      );
      this.events.playerUpdates.next({ oldPlayer, newPlayer, adminId });
      return newPlayer;
    });
  }

  /**
   * Player accepts the rules.
   * Without accepting the rules, player cannot join the queue nor any game.
   */
  async acceptTerms(playerId: string): Promise<Player> {
    return await this.updatePlayer(playerId, { hasAcceptedRules: true });
  }

  async getPlayerStats(playerId: string) {
    return {
      player: playerId,
      gamesPlayed: await this.gamesService.getPlayerGameCount(playerId, {
        endedOnly: true,
      }),
      classesPlayed: await this.gamesService.getPlayerPlayedClassCount(
        playerId,
      ),
    };
  }

  /**
   * Unset activeGame for all players that do not participate in an active game.
   */
  async releaseAllPlayers() {
    const players = plainToInstance(
      Player,
      await this.playerModel
        .find({ activeGame: { $exists: 1 } })
        .lean()
        .exec(),
    );

    await Promise.all(
      players.map(async (player) => {
        const game = await this.gamesService.getById(
          player.activeGame as Types.ObjectId,
        );
        if (!game.isInProgress()) {
          await this.updatePlayer(player.id, { $unset: { activeGame: 1 } });
        }
      }),
    );
  }

  private async verifyTf2InGameHours(steamId: string) {
    const { value: minimumTf2InGameHours } =
      await this.configurationService.getMinimumTf2InGameHours();

    if (minimumTf2InGameHours <= 0) {
      return;
    }

    const hoursInTf2 = await this.steamApiService.getTf2InGameHours(steamId);
    if (hoursInTf2 < minimumTf2InGameHours) {
      throw new InsufficientTf2InGameHoursError(
        steamId,
        minimumTf2InGameHours,
        hoursInTf2,
      );
    }
  }
}
