import {
  WebSocketGateway,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import { Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { Events } from '@/events/events';
import { WebsocketEvent } from '@/websocket-event';
import { instanceToPlain } from 'class-transformer';

@WebSocketGateway()
export class GamesGateway implements OnGatewayInit, OnModuleInit {
  private socket: Socket;

  constructor(
    @Inject(forwardRef(() => PlayerSubstitutionService))
    private playerSubstitutionService: PlayerSubstitutionService,
    private events: Events,
  ) {}

  @WsAuthorized()
  @SubscribeMessage('replace player')
  async replacePlayer(
    client: Socket,
    payload: { gameId: string; replaceeId: string },
  ) {
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
      this.socket.emit(WebsocketEvent.gameCreated, instanceToPlain(game)),
    );
    this.events.gameChanges.subscribe(({ game }) =>
      this.socket.emit(WebsocketEvent.gameUpdated, instanceToPlain(game)),
    );
  }
}
