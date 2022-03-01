import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Error, Types } from 'mongoose';
import { MongooseDocument } from '@/utils/mongoose-document';
import { Expose, Transform } from 'class-transformer';
import { Rcon } from 'rcon-client/lib';
import { GameServerProvider } from './game-server-provider';

@Schema({ discriminatorKey: 'provider' })
export class GameServer extends MongooseDocument {
  provider: GameServerProvider;

  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id?.toString())
  id!: string;

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

  /**
   * Create a new RCON connection to the gameserver.
   */
  async rcon(): Promise<Rcon> {
    throw new Error('not implemented');
  }

  /**
   * The name of the voice channel for this gameserver.
   */
  async voiceChannelName(): Promise<string> {
    throw new Error('not implemented');
  }
}

export type GameServerDocument = GameServer & Document;
export const gameServerSchema = SchemaFactory.createForClass(GameServer);
