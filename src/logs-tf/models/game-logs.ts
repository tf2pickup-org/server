import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class GameLogs {
  @TransformObjectId()
  @Prop({ required: true, unique: true, sparse: true })
  logSecret!: string;

  @Prop({ required: true, default: [], type: [String] })
  logs!: string[];
}

export type GameLogsDocument = GameLogs & Document;
export const gameLogsSchema = SchemaFactory.createForClass(GameLogs);
