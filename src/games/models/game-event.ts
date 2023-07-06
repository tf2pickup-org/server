import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEventType } from './game-event-type';

@Schema({ discriminatorKey: 'event' })
export class GameEvent {
  event!: GameEventType;

  @Prop({ required: true, default: () => new Date() })
  at!: Date;
}

export const gameEventSchema = SchemaFactory.createForClass(GameEvent);
