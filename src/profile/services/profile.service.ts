import { Events } from '@/events/events';
import { LinkedProfilesService } from '@/players/services/linked-profiles.service';
import { OnlinePlayersService } from '@/players/services/online-players.service';
import { WebsocketEvent } from '@/websocket-event';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { isEqual } from 'lodash';
import { map, filter } from 'rxjs';

@Injectable()
export class ProfileService implements OnModuleInit {
  constructor(
    private events: Events,
    private onlinePlayersService: OnlinePlayersService,
    private linkedProfilesService: LinkedProfilesService,
  ) {}

  onModuleInit() {
    this.events.linkedProfilesChanged.subscribe(({ playerId }) => {
      this.onlinePlayersService
        .getSocketsForPlayer(playerId)
        .forEach(async (socket) => {
          socket.emit(WebsocketEvent.profileUpdate, {
            linkedProfiles: await this.linkedProfilesService.getLinkedProfiles(
              playerId,
            ),
          });
        });
    });

    this.events.playerUpdates
      .pipe(
        map(({ oldPlayer, newPlayer }) => ({
          oldPlayer: instanceToPlain(oldPlayer),
          newPlayer: instanceToPlain(newPlayer),
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
}
