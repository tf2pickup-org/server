import { WebSocketGateway, OnGatewayInit, SubscribeMessage } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { GamesService } from '../services/games.service';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { GameLauncherService } from '../services/game-launcher.service';
import { GameRuntimeService } from '../services/game-runtime.service';
import { merge } from 'rxjs';
import { GameEventHandlerService } from '../services/game-event-handler.service';

@WebSocketGateway()
export class GamesGateway implements OnGatewayInit {

  constructor(
    private gamesService: GamesService,
    private gameLauncherService: GameLauncherService,
    private gameRuntimeService: GameRuntimeService,
    private gameEventHandlerService: GameEventHandlerService,
  ) { }

  @WsAuthorized()
  @SubscribeMessage('replace player')
  async replacePlayer(client: any, payload: { gameId: string, replaceeId: string }) {
    return await this.gamesService.replacePlayer(payload.gameId, payload.replaceeId, client.request.user.id);
  }

  afterInit(socket: Socket) {
    this.gamesService.gameCreated.subscribe(game => socket.emit('game created', game));

    merge(
      this.gamesService.gameUpdated,
      this.gameLauncherService.gameUpdated,
      this.gameRuntimeService.gameUpdated,
      this.gameEventHandlerService.gameUpdated,
    ).subscribe(game => socket.emit('game updated', game));
  }

}
