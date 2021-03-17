import { Events } from '@/events/events';
import { OnlinePlayersService } from '@/players/services/online-players.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { WebsocketEvent } from '@/websocket-event';
import { classToPlain } from 'class-transformer';

@Injectable()
export class ProfileUpdaterService implements OnModuleInit {

  constructor(
    private events: Events,
    private onlinePlayersService: OnlinePlayersService,
  ) { }

  onModuleInit() {
    this.events.playerUpdates.subscribe(({ newPlayer }) => {
      this.onlinePlayersService
        .getSocketsForPlayer(newPlayer.id)
        .forEach(socket => socket.emit(WebsocketEvent.profileUpdate, classToPlain(newPlayer)));
    });
  }

}
