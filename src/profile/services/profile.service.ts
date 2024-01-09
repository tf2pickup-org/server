import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Events } from '@/events/events';
import { PlayerPreferencesService } from '@/player-preferences/services/player-preferences.service';
import { Player } from '@/players/models/player';
import { LinkedProfilesService } from '@/players/services/linked-profiles.service';
import { OnlinePlayersService } from '@/players/services/online-players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { QueueConfig } from '@/queue-config/interfaces/queue-config';
import { MapVoteService } from '@/queue/services/map-vote.service';
import { WebsocketEvent } from '@/websocket-event';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { map, filter } from 'rxjs';
import { ProfileDto } from '../dto/profile.dto';
import { Restriction, RestrictionReason } from '../interfaces/restriction';
import { serialize } from '@/shared/serialize';
import { isUndefined } from 'lodash';
import { QUEUE_CONFIG } from '@/queue-config/queue-config.token';

const playersEqual = (a: Player, b: Player) => {
  return a.name === b.name;
};

@Injectable()
export class ProfileService implements OnModuleInit {
  constructor(
    private events: Events,
    private onlinePlayersService: OnlinePlayersService,
    private linkedProfilesService: LinkedProfilesService,
    private playerBansService: PlayerBansService,
    private mapVoteService: MapVoteService,
    private playerPreferencesService: PlayerPreferencesService,
    private configurationService: ConfigurationService,
    @Inject(QUEUE_CONFIG) private readonly queueConfig: QueueConfig,
  ) {}

  onModuleInit() {
    this.events.linkedProfilesChanged.subscribe(
      async ({ playerId }) =>
        await Promise.all(
          this.onlinePlayersService
            .getSocketsForPlayer(playerId)
            .map(async (socket) =>
              socket.emit(WebsocketEvent.profileUpdate, {
                linkedProfiles:
                  await this.linkedProfilesService.getLinkedProfiles(playerId),
              }),
            ),
        ),
    );

    // update player profile whenever his player record changes
    this.events.playerUpdates
      .pipe(
        filter(
          ({ oldPlayer, newPlayer }) => !playersEqual(oldPlayer, newPlayer),
        ),
        map(({ newPlayer }) => newPlayer),
      )
      .subscribe(
        async (player) =>
          await Promise.all(
            this.onlinePlayersService
              .getSocketsForPlayer(player._id)
              .map(async (socket) =>
                socket.emit(WebsocketEvent.profileUpdate, {
                  player: await serialize(player),
                }),
              ),
          ),
      );

    // update player's active game info
    this.events.playerUpdates
      .pipe(
        filter(
          ({ oldPlayer, newPlayer }) =>
            oldPlayer.activeGame?.toString() !==
            newPlayer.activeGame?.toString(),
        ),
      )
      .subscribe(({ newPlayer }) => {
        this.onlinePlayersService
          .getSocketsForPlayer(newPlayer._id)
          .forEach((socket) =>
            socket.emit(WebsocketEvent.profileUpdate, {
              activeGameId: newPlayer.activeGame?.toString() ?? null,
            }),
          );
      });
  }

  async getProfile(player: Player): Promise<ProfileDto> {
    const [bans, preferences, linkedProfiles, restrictions] = await Promise.all(
      [
        await this.playerBansService.getPlayerActiveBans(player._id),
        await this.playerPreferencesService.getPlayerPreferences(player._id),
        await this.linkedProfilesService.getLinkedProfiles(player._id),
        await this.getPlayerRestrictions(player),
      ],
    );

    return {
      player,
      hasAcceptedRules: player.hasAcceptedRules,
      ...(Boolean(player.activeGame) && {
        activeGameId: player.activeGame!.toString(),
      }),
      bans,
      mapVote: this.mapVoteService.playerVote(player._id),
      preferences: Object.fromEntries(preferences),
      linkedProfiles,
      restrictions,
    };
  }

  private async getPlayerRestrictions(player: Player): Promise<Restriction[]> {
    const restrictions: Restriction[] = [];

    if (
      !player.skill &&
      (await this.configurationService.get<boolean>(
        'queue.deny_players_with_no_skill_assigned',
      ))
    ) {
      restrictions.push({
        reason: RestrictionReason.accountNeedsReview,
        gameClasses: this.queueConfig.classes.map(
          (gameClass) => gameClass.name,
        ),
      });
    }

    if (!isUndefined(player.skill)) {
      const threshold = await this.configurationService.get<number>(
        'queue.player_skill_threshold',
      );
      const restrictedClasses = this.queueConfig.classes
        .filter((gameClass) => player.skill!.has(gameClass.name))
        .filter((gameClass) => player.skill!.get(gameClass.name)! < threshold)
        .map((gameClass) => gameClass.name);
      if (restrictedClasses.length > 0) {
        restrictions.push({
          reason: RestrictionReason.playerSkillBelowThreshold,
          gameClasses: restrictedClasses,
        });
      }
    }

    return restrictions;
  }
}
