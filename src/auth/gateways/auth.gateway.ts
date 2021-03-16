import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Inject, OnModuleInit } from '@nestjs/common';
import { authenticate } from 'socketio-jwt-auth';
import { PlayersService } from '@/players/services/players.service';

@WebSocketGateway()
export class AuthGateway implements OnModuleInit {

  @WebSocketServer()
  server: Server;

  constructor(
    private playersService: PlayersService,
    @Inject('WEBSOCKET_SECRET') private websocketSecret: string,
  ) { }

  onModuleInit() {
    this.server?.use(authenticate({
      secret: this.websocketSecret,
      succeedWithoutToken: true,
    }, async (payload, done) => {
      if (payload && payload.id) {
        try {
          const player = await this.playersService.getById(payload.id);
          return done(null, player);
        } catch (error) {
          return done(error, false);
        }
      } else {
        return done();
      }
    }));
  }

}
