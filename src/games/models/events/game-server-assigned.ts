import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';

@Schema()
export class GameServerAssigned extends GameEvent {
  event = GameEventType.gameServerAssigned;

  @TransformObjectId()
  @Prop({ type: Types.ObjectId, ref: 'Player' })
  actor?: PlayerId;

  @Prop({ required: true })
  gameServerName!: string;
}

export const gameServerAssignedSchema =
  SchemaFactory.createForClass(GameServerAssigned);
