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

  /**
   * The gameserver's public IP address.
   */
  @Prop({ required: true, trim: true })
  address!: string;

  /**
   * The IP address of the gameserver's that the heartbeat came from.
   */
  @Prop()
  internalIpAddress: string;

  @Prop({ required: true })
  port!: string;

  @Exclude({ toPlainOnly: true })
  @Prop({ required: true })
  rconPassword!: string;

  @Prop({ default: true })
  isAvailable?: boolean; // is the server available for playing pickups

  @Prop({ default: false })
  isOnline?: boolean; // was the server online last we checked

  @Prop()
  voiceChannelName?: string;

  @Transform(({ value }) => value.toString())
  @Prop({ type: Types.ObjectId, ref: 'Game' })
  game?: Types.ObjectId; // currently running game
}

export type GameServerDocument = GameServer & Document;
export const GameServerSchema = SchemaFactory.createForClass(GameServer);
