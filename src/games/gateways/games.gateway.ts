import { WebSocketGateway, OnGatewayInit } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { GamesService } from '../services/games.service';

@WebSocketGateway()
export class GamesGateway implements OnGatewayInit {

  constructor(
    private gamesService: GamesService,
  ) { }

  afterInit(socket: Socket) {
    this.gamesService.gameCreated.subscribe(game => socket.emit('game created', game));
  }

}
