import { WebSocketGateway, SubscribeMessage } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import {
  Inject,
  forwardRef,
  OnModuleInit,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { Events } from '@/events/events';
import { WebsocketEvent } from '@/websocket-event';
import { SerializerInterceptor } from '@/shared/interceptors/serializer.interceptor';
import { Serializable } from '@/shared/serializable';
import { GameDto } from '../dto/game.dto';
import { WebsocketEventEmitter } from '@/shared/websocket-event-emitter';
import { Types } from 'mongoose';
import { GameId } from '../game-id';
import { PlayerId } from '@/players/types/player-id';
import { CanReplacePlayerGuard } from '../guards/can-replace-player.guard';

@WebSocketGateway()
export class GamesGateway
  extends WebsocketEventEmitter<GameDto>
  implements OnModuleInit
{
  constructor(
    @Inject(forwardRef(() => PlayerSubstitutionService))
    private playerSubstitutionService: PlayerSubstitutionService,
    private events: Events,
  ) {
    super();
  }

  @WsAuthorized()
  @UseGuards(CanReplacePlayerGuard)
  @SubscribeMessage('replace player')
  @UseInterceptors(SerializerInterceptor)
  async replacePlayer(
    client: Socket,
    payload: { gameId: string; replaceeId: string },
  ): Promise<Serializable<GameDto>> {
    return await this.playerSubstitutionService.replacePlayer(
      new Types.ObjectId(payload.gameId) as GameId,
      new Types.ObjectId(payload.replaceeId) as PlayerId,
      client.user._id,
    );
  }

  onModuleInit() {
    this.events.gameCreated.subscribe(({ game }) =>
      this.emit(WebsocketEvent.gameCreated, game),
    );
    this.events.gameChanges.subscribe(({ newGame }) =>
      this.emit(WebsocketEvent.gameUpdated, newGame),
    );
  }
}
