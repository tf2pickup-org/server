import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';

export enum GameEndedReason {
  matchEnded = 'match ended',
  interrupted = 'interrupted',
}

@Schema()
export class GameEnded extends GameEvent {
  event = GameEventType.gameEnded;

  @Prop({ required: true, enum: GameEndedReason })
  reason!: GameEndedReason;

  @TransformObjectId()
  @Prop({ type: Types.ObjectId, ref: 'Player' })
  actor?: PlayerId;
}

export const gameEndedSchema = SchemaFactory.createForClass(GameEnded);
