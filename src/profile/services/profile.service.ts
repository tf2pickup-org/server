import { Events } from '@/events/events';
import { LinkedProfilesService } from '@/players/services/linked-profiles.service';
import { OnlinePlayersService } from '@/players/services/online-players.service';
import { WebsocketEvent } from '@/websocket-event';
import { Injectable, OnModuleInit } from '@nestjs/common';

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
  }
}
