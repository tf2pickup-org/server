import { Injectable } from '@nestjs/common';
import { GameServer } from '@/game-servers/models/game-server';
import { Rcon } from 'rcon-client';

@Injectable()
export class RconFactoryService {

  async createRcon(gameServer: GameServer): Promise<Rcon> {
    return new Promise(async  (resolve, reject) => {
      const rcon = new Rcon({
        host: gameServer.address,
        port: parseInt(gameServer.port, 10),
        password: gameServer.rconPassword,
        timeout: 30000,
      });

      rcon.on('error', error => {
        return reject(error);
      });

      rcon.connect().then(resolve).catch(reject);
    });
  }

}
