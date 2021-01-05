import { WebSocketGateway, OnGatewayInit, SubscribeMessage } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import { Game } from '../models/game';
import { Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { Events } from '@/events/events';

@WebSocketGateway()
export class GamesGateway implements OnGatewayInit, OnModuleInit {

  private socket: Socket;

  constructor(
    @Inject(forwardRef(() => PlayerSubstitutionService)) private playerSubstitutionService: PlayerSubstitutionService,
    private events: Events,
  ) { }

  @WsAuthorized()
  @SubscribeMessage('replace player')
  async replacePlayer(client: any, payload: { gameId: string, replaceeId: string }) {
    return await this.playerSubstitutionService.replacePlayer(payload.gameId, payload.replaceeId, client.request.user.id);
  }

  emitGameCreated(game: Game) {
    this.socket.emit('game created', game);
  }

  afterInit(socket: Socket) {
    this.socket = socket;
  }

  onModuleInit() {
    this.events.gameChanges.subscribe(({ game }) => this.socket.emit('game updated', game));
  }

}
