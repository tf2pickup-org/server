import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MongooseDocument } from '@/utils/mongoose-document';
import { Exclude, Expose, Transform } from 'class-transformer';

@Schema()
export class GameServer extends MongooseDocument {
  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id?.toString())
  id?: string;

  @Prop({ default: () => new Date() })
  createdAt?: Date;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  address!: string;

  @Prop({ required: true })
  port!: string;

  @Exclude({ toPlainOnly: true })
  @Prop({ required: true })
  rconPassword!: string;

  @Prop({ default: true })
  isAvailable?: boolean; // is the server available for playing pickups

  @Prop({ default: false })
  isOnline?: boolean; // was the server online last we checked

  @Prop({ type: () => [String], index: true })
  resolvedIpAddresses?: string[]; // for tracing game server logs

  @Prop()
  mumbleChannelName?: string;

  @Transform(({ value }) => value.toString())
  @Prop({ type: Types.ObjectId, ref: 'Game' })
  game?: Types.ObjectId; // currently running game

  @Exclude({ toPlainOnly: true })
  @Prop({ default: false })
  deleted?: boolean;
}

export type GameServerDocument = GameServer & Document;
export const GameServerSchema = SchemaFactory.createForClass(GameServer);
