import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import { Document, Types } from 'mongoose';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { MongooseDocument } from '@/utils/mongoose-document';

@Schema()
export class StaticGameServer extends MongooseDocument {
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

  @TransformObjectId()
  @Prop({ type: Types.ObjectId, ref: 'Game' })
  game?: Types.ObjectId; // currently running game

  /**
   * The IP address of the gameserver's that the heartbeat came from.
   */
  @Prop()
  internalIpAddress: string;

  @Prop({ required: true })
  rconPassword!: string;

  /**
   * Was the server online last time we checked?
   */
  @Prop({ default: false })
  isOnline!: boolean;

  @Prop({ default: () => new Date() })
  lastHeartbeatAt?: Date;

  @Prop({ default: 1 })
  priority!: number;
}

export type StaticGameServerDocument = StaticGameServer & Document;
export const staticGameServerSchema =
  SchemaFactory.createForClass(StaticGameServer);
