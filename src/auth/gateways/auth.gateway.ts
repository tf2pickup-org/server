import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Inject, OnModuleInit } from '@nestjs/common';
import { PlayersService } from '@/players/services/players.service';
import { authorize } from '@thream/socketio-jwt';

@WebSocketGateway()
export class AuthGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private playersService: PlayersService,
    @Inject('WEBSOCKET_SECRET') private websocketSecret: string,
  ) {}

  onModuleInit() {
    this.server.use(
      authorize({
        secret: this.websocketSecret,
        onAuthentication: async (payload) => {
          return await this.playersService.getById(payload.id);
        },
      }),
    );
  }
}
