import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';

@Schema()
export class GameServerInitialized extends GameEvent {
  event = GameEventType.gameServerInitialized;
}

export const gameServerInitializedSchema = SchemaFactory.createForClass(
  GameServerInitialized,
);
