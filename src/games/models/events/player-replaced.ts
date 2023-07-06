import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';

@Schema()
export class PlayerReplaced extends GameEvent {
  event = GameEventType.playerReplaced;

  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  replacee!: PlayerId;

  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  replacement!: PlayerId;
}

export const playerReplacedSchema =
  SchemaFactory.createForClass(PlayerReplaced);
