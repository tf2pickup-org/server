import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';

@Schema()
export class GameStarted extends GameEvent {
  event = GameEventType.gameStarted;
}

export const gameStartedSchema = SchemaFactory.createForClass(GameStarted);
