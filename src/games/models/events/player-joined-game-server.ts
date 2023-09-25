import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';
import { PlayerId } from '@/players/types/player-id';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Types } from 'mongoose';
import { app } from '@/app';
import { PlayersService } from '@/players/services/players.service';
import { GameEventDto } from '@/games/dto/game-event.dto';

@Schema()
export class PlayerJoinedGameServer extends GameEvent {
  event = GameEventType.playerJoinedGameServer;

  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  player!: PlayerId;

  async serialize(): Promise<GameEventDto> {
    const playersService = app.get(PlayersService);
    return {
      event: this.event,
      at: this.at.toISOString(),
      player: await playersService.getById(this.player),
    };
  }
}

export const playerJoinedGameServerSchema = SchemaFactory.createForClass(
  PlayerJoinedGameServer,
);
