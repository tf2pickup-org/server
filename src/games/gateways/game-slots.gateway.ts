import { WebsocketEvent } from '@/websocket-event';
import { WebSocketGateway } from '@nestjs/websockets';
import { GameSlotDto } from '../dto/game-slot-dto';
import { OnModuleInit } from '@nestjs/common';
import { Events } from '@/events/events';
import { WebsocketEventEmitter } from '@/shared/websocket-event-emitter';
import { filter, map } from 'rxjs/operators';
import { isEqual } from 'lodash';

@WebSocketGateway()
export class GameSlotsGateway
  extends WebsocketEventEmitter<GameSlotDto>
  implements OnModuleInit
{
  constructor(private readonly events: Events) {
    super();
  }

  onModuleInit() {
    this.events.gameChanges
      .pipe(
        filter(
          ({ oldGame, newGame }) => !isEqual(oldGame.slots, newGame.slots),
        ),
        map(({ newGame }) => ({
          number: newGame.number,
          slots: newGame.slots,
        })),
      )
      .subscribe(async ({ number, slots }) => {
        await this.emit({
          room: `game/${number}`,
          event: WebsocketEvent.gameSlotsUpdated,
          payload: slots,
        });
      });
  }
}
