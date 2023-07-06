import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';

@Schema()
export class GameCreated extends GameEvent {
  event = GameEventType.gameCreated;
}

export const gameCreatedSchema = SchemaFactory.createForClass(GameCreated);
