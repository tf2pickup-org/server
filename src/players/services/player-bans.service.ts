import {
  Injectable,
  OnModuleInit,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PlayerBan, PlayerBanDocument } from '../models/player-ban';
import { merge } from 'rxjs';
import { OnlinePlayersService } from './online-players.service';
import { PlayersService } from './players.service';
import { Events } from '@/events/events';
import { plainToClass } from 'class-transformer';
import { WebsocketEvent } from '@/websocket-event';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class PlayerBansService implements OnModuleInit {
  private logger = new Logger(PlayerBansService.name);

  constructor(
    @InjectModel(PlayerBan.name)
    private playerBanModel: Model<PlayerBanDocument>,
    private onlinePlayersService: OnlinePlayersService,
    @Inject(forwardRef(() => PlayersService))
    private playersService: PlayersService,
    private events: Events,
  ) {}

  onModuleInit() {
    merge(this.events.playerBanAdded, this.events.playerBanRevoked).subscribe(
      async ({ ban }) => {
        const playerId = ban.player.toString();
        const bans = await this.getPlayerActiveBans(playerId);
        this.onlinePlayersService
          .getSocketsForPlayer(playerId)
          .forEach((socket) =>
            socket.emit(WebsocketEvent.profileUpdate, { bans }),
          );
      },
    );
  }

  async getById(banId: string): Promise<PlayerBan> {
    return plainToClass(
      PlayerBan,
      await this.playerBanModel.findById(banId).orFail().lean().exec(),
    );
  }

  async getPlayerBans(playerId: string): Promise<PlayerBan[]> {
    return plainToClass(
      PlayerBan,
      await this.playerBanModel
        .find({ player: playerId })
        .sort({ start: -1 })
        .lean()
        .exec(),
    );
  }

  async getPlayerActiveBans(
    playerId: string | Types.ObjectId,
  ): Promise<PlayerBan[]> {
    const plain = await this.playerBanModel
      .find({
        player: playerId,
        end: {
          $gte: new Date(),
        },
      })
      .lean()
      .exec();
    return plainToClass(PlayerBan, plain);
  }

  async addPlayerBan(props: PlayerBan): Promise<PlayerBan> {
    const player = await this.playersService.getById(props.player.toString());
    const { id } = await this.playerBanModel.create(props);
    const addedBan = await this.getById(id);
    this.logger.verbose(
      `ban added for player ${player.id} (reason: ${addedBan.reason})`,
    );
    this.events.playerBanAdded.next({ ban: addedBan });
    return addedBan;
  }

  async revokeBan(banId: string, adminId: string): Promise<PlayerBan> {
    const ban = await this.getById(banId);
    if (ban.end < new Date()) {
      throw new Error('this ban has already expired');
    }

    const newBan = await this.updateBan(banId, { end: new Date() });
    const player = await this.playersService.getById(newBan.player.toString());
    this.logger.verbose(`ban revoked for player ${player.id}`);
    this.events.playerBanRevoked.next({ ban: newBan, adminId });
    return newBan;
  }

  private async updateBan(
    banId: string,
    update: Partial<PlayerBan>,
  ): Promise<PlayerBan> {
    return plainToClass(
      PlayerBan,
      await this.playerBanModel
        .findOneAndUpdate({ _id: banId }, update, { new: true })
        .orFail()
        .lean()
        .exec(),
    );
  }
}
