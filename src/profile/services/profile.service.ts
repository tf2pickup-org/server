import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Events } from '@/events/events';
import { PlayerPreferencesService } from '@/player-preferences/services/player-preferences.service';
import { Player } from '@/players/models/player';
import { LinkedProfilesService } from '@/players/services/linked-profiles.service';
import { OnlinePlayersService } from '@/players/services/online-players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { QueueConfig } from '@/queue-config/interfaces/queue-config';
import { MapVoteService } from '@/queue/services/map-vote.service';
import { serialize } from '@/shared/serialize';
import { WebsocketEvent } from '@/websocket-event';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { map, filter } from 'rxjs';
import { ProfileDto } from '../dto/profile.dto';
import { Restriction, RestrictionReason } from '../interfaces/restriction';

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
    @Inject('QUEUE_CONFIG') private readonly queueConfig: QueueConfig,
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
    this.events.playerUpdates.pipe(map(({ newPlayer }) => newPlayer)).subscribe(
      async (player) =>
        await Promise.all(
          this.onlinePlayersService
            .getSocketsForPlayer(player.id)
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
            oldPlayer.activeGame !== newPlayer.activeGame,
        ),
      )
      .subscribe(({ newPlayer }) => {
        this.onlinePlayersService
          .getSocketsForPlayer(newPlayer.id)
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
        await this.playerBansService.getPlayerActiveBans(player.id),
        await this.playerPreferencesService.getPlayerPreferences(player.id),
        await this.linkedProfilesService.getLinkedProfiles(player.id),
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
      mapVote: this.mapVoteService.playerVote(player.id),
      preferences: Object.fromEntries(preferences),
      linkedProfiles,
      restrictions,
    };
  }

  private async getPlayerRestrictions(player: Player): Promise<Restriction[]> {
    const restrictions: Restriction[] = [];

    if (
      !player.skill &&
      (await this.configurationService.getDenyPlayersWithNoSkillAssigned())
        .value
    ) {
      restrictions.push({
        reason: RestrictionReason.accountNeedsReview,
        gameClasses: this.queueConfig.classes.map(
          (gameClass) => gameClass.name,
        ),
      });
    }

    return restrictions;
  }
}
