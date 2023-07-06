import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';

@Schema()
export class SubstituteRequested extends GameEvent {
  event = GameEventType.substituteRequested;

  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  player!: PlayerId;
}

export const substituteRequestedSchema =
  SchemaFactory.createForClass(SubstituteRequested);
