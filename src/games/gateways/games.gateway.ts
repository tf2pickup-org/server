import { WebSocketGateway, OnGatewayInit, SubscribeMessage } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { GamesService } from '../services/games.service';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';

@WebSocketGateway()
export class GamesGateway implements OnGatewayInit {

  constructor(
    private gamesService: GamesService,
  ) { }

  @WsAuthorized()
  @SubscribeMessage('replace player')
  async replacePlayer(client: any, payload: { gameId: string, replaceeId: string }) {
    return await this.gamesService.replacePlayer(payload.gameId, payload.replaceeId, client.request.user.id);
  }

  afterInit(socket: Socket) {
    this.gamesService.gameCreated.subscribe(game => socket.emit('game created', game));
    this.gamesService.gameUpdated.subscribe(game => socket.emit('game updated', game));
  }

}
