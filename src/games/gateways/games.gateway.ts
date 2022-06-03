import {
  WebSocketGateway,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import {
  Inject,
  forwardRef,
  OnModuleInit,
  UseInterceptors,
} from '@nestjs/common';
import { Events } from '@/events/events';
import { WebsocketEvent } from '@/websocket-event';
import { serialize } from '@/shared/serialize';
import { SerializerInterceptor } from '@/shared/interceptors/serializer.interceptor';
import { Serializable } from '@/shared/serializable';
import { GameDto } from '../dto/game.dto';
import { WebsocketEventEmitter } from '@/shared/websocket-event-emitter';

@WebSocketGateway()
export class GamesGateway
  implements OnGatewayInit, OnModuleInit, WebsocketEventEmitter<GameDto>
{
  private socket: Socket;

  constructor(
    @Inject(forwardRef(() => PlayerSubstitutionService))
    private playerSubstitutionService: PlayerSubstitutionService,
    private events: Events,
  ) {}

  async emit(event: WebsocketEvent, payload: Serializable<GameDto>) {
    this.socket.emit(event, await serialize(payload));
  }

  @WsAuthorized()
  @SubscribeMessage('replace player')
  @UseInterceptors(SerializerInterceptor)
  async replacePlayer(
    client: Socket,
    payload: { gameId: string; replaceeId: string },
  ): Promise<Serializable<GameDto>> {
    return await this.playerSubstitutionService.replacePlayer(
      payload.gameId,
      payload.replaceeId,
      client.user.id,
    );
  }

  afterInit(socket: Socket) {
    this.socket = socket;
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
