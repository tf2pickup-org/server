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
import { PlayerStats } from '../dto/player-stats';
import { Etf2lProfile } from '../etf2l-profile';
import { SteamApiService } from './steam-api.service';
import { ObjectId } from 'mongodb';
import { PlayerAvatar } from '../models/player-avatar';
import { Events } from '@/events/events';
import { classToPlain, plainToClass } from 'class-transformer';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { OnlinePlayersService } from './online-players.service';
import { WebsocketEvent } from '@/websocket-event';
import { Error, Model, UpdateQuery } from 'mongoose';
import { Tf2InGameHoursVerificationError } from '../errors/tf2-in-game-hours-verification.error';
import { AccountBannedError } from '../errors/account-banned.error';
import { InsufficientTf2InGameHoursError } from '../errors/insufficient-tf2-in-game-hours.error';
import { PlayerRole } from '../models/player-role';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { filter, map } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { InjectModel } from '@nestjs/mongoose';

type ForceCreatePlayerOptions = Pick<Player, 'steamId' | 'name'>;

@Injectable()
export class PlayersService implements OnModuleInit {
  private logger = new Logger(PlayersService.name);

  constructor(
    private environment: Environment,
    private etf2lProfileService: Etf2lProfileService,
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    private steamApiService: SteamApiService,
    private events: Events,
    private onlinePlayersService: OnlinePlayersService,
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

    this.events.playerUpdates
      .pipe(
        map(({ oldPlayer, newPlayer }) => ({
          oldPlayer: classToPlain(oldPlayer),
          newPlayer: classToPlain(newPlayer),
        })),
        filter(({ oldPlayer, newPlayer }) => !isEqual(newPlayer, oldPlayer)),
      )
      .subscribe(({ newPlayer }) => {
        this.onlinePlayersService
          .getSocketsForPlayer(newPlayer.id)
          .forEach((socket) =>
            socket.emit(WebsocketEvent.profileUpdate, {
              player: newPlayer,
            }),
          );
      });
  }

  async getAll(): Promise<Player[]> {
    return plainToClass(
      Player,
      await this.playerModel
        .find({ roles: { $ne: PlayerRole.bot } })
        .lean()
        .exec(),
    );
  }

  async getById(id: string | ObjectId): Promise<Player> {
    return plainToClass(
      Player,
      await this.playerModel.findById(id).orFail().lean().exec(),
    );
  }

  async findBySteamId(steamId: string): Promise<Player> {
    return plainToClass(
      Player,
      await this.playerModel.findOne({ steamId }).orFail().lean().exec(),
    );
  }

  async findByEtf2lProfileId(etf2lProfileId: number): Promise<Player> {
    return plainToClass(
      Player,
      await this.playerModel.findOne({ etf2lProfileId }).orFail().lean().exec(),
    );
  }

  async findBot(): Promise<Player> {
    return plainToClass(
      Player,
      this.playerModel
        .findOne({ name: this.environment.botName })
        .orFail()
        .lean()
        .exec(),
    );
  }

  async createPlayer(steamProfile: SteamProfile): Promise<Player> {
    await this.verifyTf2InGameHours(steamProfile.id);

    let etf2lProfile: Etf2lProfile;
    let name = steamProfile.displayName;

    try {
      etf2lProfile = await this.etf2lProfileService.fetchPlayerInfo(
        steamProfile.id,
      );

      if (
        etf2lProfile.bans?.filter((ban) => ban.end > Date.now() / 1000).length >
        0
      ) {
        throw new AccountBannedError('this account is banned on ETF2L');
      }

      name = etf2lProfile.name;
    } catch (error) {
      if (await this.configurationService.isEtf2lAccountRequired()) {
        throw error;
      }
    }

    const avatar: PlayerAvatar = {
      small: steamProfile.photos[0].value,
      medium: steamProfile.photos[1].value,
      large: steamProfile.photos[2].value,
    };

    const id = (
      await this.playerModel.create({
        steamId: steamProfile.id,
        name,
        avatar,
        roles:
          this.environment.superUser === steamProfile.id
            ? [PlayerRole.superUser, PlayerRole.admin]
            : [],
        etf2lProfileId: etf2lProfile?.id,
        hasAcceptedRules: false,
      })
    )._id;

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
    let etf2lProfile: Etf2lProfile;
    try {
      etf2lProfile = await this.etf2lProfileService.fetchPlayerInfo(
        playerData.steamId,
      );
    } catch (error) {
      etf2lProfile = undefined;
    }

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
    const oldPlayer = await this.getById(playerId);
    const newPlayer = plainToClass(
      Player,
      await this.playerModel
        .findOneAndUpdate({ _id: playerId }, update, { new: true })
        .lean()
        .exec(),
    );
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
      gamesPlayed: await this.gamesService.getPlayerGameCount(playerId, {
        endedOnly: true,
      }),
      classesPlayed: new Map(
        Object.entries(
          await this.gamesService.getPlayerPlayedClassCount(playerId),
        ),
      ) as Map<Tf2ClassName, number>,
    });
  }

  private async verifyTf2InGameHours(steamId: string) {
    const minimumTf2InGameHours =
      await this.configurationService.getMinimumTf2InGameHours();
    try {
      const hoursInTf2 = await this.steamApiService.getTf2InGameHours(steamId);
      if (hoursInTf2 < minimumTf2InGameHours) {
        throw new InsufficientTf2InGameHoursError();
      }
    } catch (error) {
      if (
        error instanceof Tf2InGameHoursVerificationError &&
        minimumTf2InGameHours <= 0
      ) {
        return;
      } else {
        throw error;
      }
    }
  }
}
