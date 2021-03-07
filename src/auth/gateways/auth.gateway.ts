import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';
import { authenticate } from 'socketio-jwt-auth';
import { KeyStoreService } from '../services/key-store.service';
import { PlayersService } from '@/players/services/players.service';

@WebSocketGateway()
export class AuthGateway implements OnModuleInit {

  @WebSocketServer()
  server: Server;

  constructor(
    private keyStoreService: KeyStoreService,
    private playersService: PlayersService,
  ) { }

  onModuleInit() {
    this.server?.use(authenticate({
      secret: this.keyStoreService.getKey('ws', 'verify') as string,
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
