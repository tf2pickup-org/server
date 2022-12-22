import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum GameEventType {
  Created = 'created',
  GameServerInitialized = 'game server initialized',
  Started = 'started',
  Ended = 'ended',
}

@Schema()
export class GameEvent {
  @Prop({ required: true, default: () => new Date() })
  at: Date;

  @Prop({ required: true })
  event: GameEventType;
}

export const gameEventSchema = SchemaFactory.createForClass(GameEvent);
