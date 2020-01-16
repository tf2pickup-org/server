import { WebSocketGateway, OnGatewayInit, SubscribeMessage } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import { Game } from '../models/game';
import { Inject, forwardRef } from '@nestjs/common';

@WebSocketGateway()
export class GamesGateway implements OnGatewayInit {

  private socket: Socket;

  constructor(
    @Inject(forwardRef(() => PlayerSubstitutionService)) private playerSubstitutionService: PlayerSubstitutionService,
  ) { }

  @WsAuthorized()
  @SubscribeMessage('replace player')
  async replacePlayer(client: any, payload: { gameId: string, replaceeId: string }) {
    return await this.playerSubstitutionService.replacePlayer(payload.gameId, payload.replaceeId, client.request.user.id);
  }

  emitGameCreated(game: Game) {
    this.socket.emit('game created', game);
  }

  emitGameUpdated(game: Game) {
    this.socket.emit('game updated', game);
  }

  afterInit(socket: Socket) {
    this.socket = socket;
  }

}
