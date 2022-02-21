import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Error, Types } from 'mongoose';
import { MongooseDocument } from '@/utils/mongoose-document';
import { Expose, Transform } from 'class-transformer';
import { Rcon } from 'rcon-client/lib';
import { GameServerProvider } from './game-server-provider';

@Schema()
export class GameServer extends MongooseDocument {
  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id?.toString())
  id!: string;

  @Prop({ enum: GameServerProvider })
  provider: GameServerProvider;

  @Prop({ default: () => new Date() })
  createdAt!: Date;

  @Prop({ required: true, trim: true })
  name: string;

  /**
   * The gameserver's public IP address.
   */
  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true })
  port: string;

  @Transform(({ value }) => value.toString())
  @Prop({ type: Types.ObjectId, ref: 'Game' })
  game?: Types.ObjectId; // currently running game

  async rcon(): Promise<Rcon> {
    throw new Error('not implemented');
  }

  async voiceChannelName(): Promise<string> {
    throw new Error('not implemented');
  }
}

export type GameServerDocument = GameServer & Document;
export const GameServerSchema = SchemaFactory.createForClass(GameServer);
