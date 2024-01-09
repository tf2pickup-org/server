import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class GameLogs {
  @Prop({ required: true, unique: true, sparse: true })
  logSecret!: string;

  @Prop({ required: true, default: [], type: [String] })
  logs!: string[];
}

export type GameLogsDocument = GameLogs & Document;
export const gameLogsSchema = SchemaFactory.createForClass(GameLogs);
