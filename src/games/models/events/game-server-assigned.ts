import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';
import { GameEventDto } from '@/games/dto/game-event.dto';
import { app } from '@/app';
import { PlayersService } from '@/players/services/players.service';

@Schema()
export class GameServerAssigned extends GameEvent {
  event = GameEventType.gameServerAssigned;

  @TransformObjectId()
  @Prop({ type: Types.ObjectId, ref: 'Player' })
  actor?: PlayerId;

  @Prop({ required: true })
  gameServerName!: string;

  async serialize(): Promise<GameEventDto> {
    const playersService = app.get(PlayersService);
    return {
      event: this.event,
      at: this.at.toISOString(),
      actor: this.actor ? await playersService.getById(this.actor) : null,
      gameServerName: this.gameServerName,
    };
  }
}

export const gameServerAssignedSchema =
  SchemaFactory.createForClass(GameServerAssigned);
