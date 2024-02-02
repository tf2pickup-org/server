import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { TwitchStream } from '../models/twitch-stream';
import { Cron, CronExpression } from '@nestjs/schedule';
import { distinctUntilChanged } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { TwitchGateway } from '../gateways/twitch.gateway';
import { TwitchAuthService } from './twitch-auth.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { TwitchTvProfile } from '../models/twitch-tv-profile';
import { plainToInstance } from 'class-transformer';
import { LinkedProfilesService } from '@/players/services/linked-profiles.service';
import { Events } from '@/events/events';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayerId } from '@/players/types/player-id';
import { TwitchTvApiService } from './twitch-tv-api.service';

@Injectable()
export class TwitchService implements OnModuleInit {
  private logger = new Logger(TwitchService.name);
  private _streams = new BehaviorSubject<TwitchStream[]>([]);

  get streams() {
    return this._streams.value;
  }

  constructor(
    private readonly twitchGateway: TwitchGateway,
    private readonly twitchAuthService: TwitchAuthService,
    private readonly playerBansService: PlayerBansService,
    @InjectModel(TwitchTvProfile.name)
    private readonly twitchTvProfileModel: Model<TwitchTvProfile>,
    private readonly linkedProfilesService: LinkedProfilesService,
    private readonly events: Events,
    private readonly configurationService: ConfigurationService,
    private readonly twitchTvApiService: TwitchTvApiService,
  ) {}

  onModuleInit() {
    this._streams
      .pipe(
        distinctUntilChanged((x, y) => JSON.stringify(x) === JSON.stringify(y)),
      )
      .subscribe((streams) => this.twitchGateway.emitStreamsUpdate(streams));

    this.linkedProfilesService.registerLinkedProfileProvider({
      name: 'twitch.tv',
      fetchProfile: async (playerId) =>
        await this.getTwitchTvProfileByPlayerId(playerId),
    });
  }

  async getTwitchTvProfileByPlayerId(
    playerId: PlayerId,
  ): Promise<TwitchTvProfile> {
    return plainToInstance(
      TwitchTvProfile,
      await this.twitchTvProfileModel
        .findOne({ player: new Types.ObjectId(playerId) })
        .orFail()
        .lean()
        .exec(),
    );
  }

  async saveUserProfile(playerId: PlayerId, code: string) {
    const token = await this.twitchAuthService.fetchUserAccessToken(code);
    const profile = await this.twitchTvApiService.getUser(token);
    await this.twitchTvProfileModel.create({
      player: new Types.ObjectId(playerId),
      userId: profile.id,
      login: profile.login,
      displayName: profile.display_name,
      profileImageUrl: profile.profile_image_url,
    });
    this.events.linkedProfilesChanged.next({ playerId });
  }

  async deleteUserProfile(playerId: PlayerId): Promise<TwitchTvProfile> {
    const ret = plainToInstance(
      TwitchTvProfile,
      await this.twitchTvProfileModel
        .findOneAndDelete({ player: new Types.ObjectId(playerId) })
        .orFail()
        .lean()
        .exec(),
    );
    this.events.linkedProfilesChanged.next({ playerId });
    return ret;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async pollUsersStreams() {
    const users = await this.twitchTvProfileModel.find();
    const promotedStreams = await this.configurationService.get<string[]>(
      'twitchtv.promoted_streams',
    );
    const rawStreams = await this.twitchTvApiService.getStreams({
      userIds: users.map((user) => user.userId),
      userLogins: promotedStreams,
    });

    const streams = (
      await Promise.all(
        rawStreams.map(async (stream) => {
          const profile = await this.twitchTvProfileModel.findOne({
            userId: stream.user_id,
          });

          if (profile === null) {
            // promoted stream
            return {
              id: stream.id,
              userName: stream.user_name,
              title: stream.title,
              thumbnailUrl: stream.thumbnail_url,
              viewerCount: stream.viewer_count,
            };
          } else {
            const bans = await this.playerBansService.getPlayerActiveBans(
              profile.player,
            );

            if (bans.length > 0) {
              return null;
            } else {
              return {
                playerId: profile.player?.toString(),
                id: stream.id,
                userName: stream.user_name,
                title: stream.title,
                thumbnailUrl: stream.thumbnail_url,
                viewerCount: stream.viewer_count,
              };
            }
          }
        }),
      )
    ).filter((stream) => Boolean(stream)) as TwitchStream[];

    this._streams.next(streams);
    this.logger.debug('streams refreshed');
  }
}
