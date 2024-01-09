import { WebsocketEventEmitter } from '@/shared/websocket-event-emitter';
import { WebSocketGateway } from '@nestjs/websockets';
import { GameEventDto } from '../dto/game-event.dto';
import { OnModuleInit } from '@nestjs/common';
import { Events } from '@/events/events';
import { filter, map } from 'rxjs';
import { isEqual } from 'lodash';
import { WebsocketEvent } from '@/websocket-event';

const roomName = (gameNumber: number) => `/games/${gameNumber}/events`;

@WebSocketGateway()
export class GameEventsGateway
  extends WebsocketEventEmitter<GameEventDto>
  implements OnModuleInit
{
  constructor(private readonly events: Events) {
    super();
  }

  onModuleInit() {
    this.events.gameChanges
      .pipe(
        filter(
          ({ oldGame, newGame }) => !isEqual(oldGame.events, newGame.events),
        ),
        map(({ newGame }) => ({
          number: newGame.number,
          events: newGame.events,
        })),
      )
      .subscribe(({ number, events }) => {
        this.emit({
          room: roomName(number),
          event: WebsocketEvent.gameEventsUpdated,
          payload: events,
        });
      });
  }
}
