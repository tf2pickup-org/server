import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';

@Schema()
export class GameEnded extends GameEvent {
  event = GameEventType.gameEnded;
}

export const gameEndedSchema = SchemaFactory.createForClass(GameEnded);
