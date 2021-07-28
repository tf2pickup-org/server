import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Inject, OnModuleInit } from '@nestjs/common';
import { PlayersService } from '@/players/services/players.service';
import { Error } from 'mongoose';
import { verify } from 'jsonwebtoken';
import { Player } from '@/players/models/player';

declare module 'socket.io' {
  interface Socket {
    user: Player;
  }
}

@WebSocketGateway()
export class AuthGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private playersService: PlayersService,
    @Inject('WEBSOCKET_SECRET') private websocketSecret: string,
  ) {}

  onModuleInit() {
    this.server.use(async (socket, next) => {
      try {
        const { token } = socket.handshake.auth;
        if (token) {
          const matches = (token as string).match(/^Bearer\s(.+)$/);
          if (matches) {
            const decodedToken = verify(matches[1], this.websocketSecret, {
              algorithms: ['HS256'],
            }) as { id: string };
            const player = await this.playersService.getById(decodedToken.id);
            socket.user = player;
          } else {
            return next(new Error('credentials_bad_format'));
          }
        }
        return next();
      } catch (error) {
        return next(error);
      }
    });
  }
}
