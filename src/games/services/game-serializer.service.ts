import { Serializer } from '@/shared/serializer';
import { Injectable } from '@nestjs/common';
import { GameDto } from '../dto/game.dto';
import { Game } from '../models/game';

@Injectable()
export class GameSerializerService extends Serializer<Game, GameDto> {
  async serialize(game: Game): Promise<GameDto> {
    return {
      id: game.id,
      launchedAt: game.launchedAt,
      endedAt: game.endedAt,
      number: game.number,
      slots: game.slots.map((slot) => ({
        player: slot.player,
        team: slot.team,
        gameClass: slot.gameClass,
        status: slot.status,
        connectionStatus: slot.connectionStatus,
      })),
      map: game.map,
      state: game.state,
      connectInfoVersion: game.connectInfoVersion,
      stvConnectString: game.stvConnectString,
      logsUrl: game.logsUrl,
      demoUrl: game.demoUrl,
      error: game.error,
      gameServer: game.gameServer,
      score: {
        blu: game.score?.get('blu'),
        red: game.score?.get('red'),
      },
    };
  }
}
