import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Expose, Transform } from 'class-transformer';
import { Types } from 'mongoose';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { MongooseDocument } from '@/utils/mongoose-document';
import { GameId } from '@/games/types/game-id';

@Schema()
export class StaticGameServer extends MongooseDocument {
  @Expose()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value, obj }) => value ?? obj._id?.toString())
  id!: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value }) => value.toISOString(), { toPlainOnly: true })
  @Prop({ default: () => new Date() })
  createdAt!: Date;

  @Prop({ required: true, trim: true })
  name!: string;

  /**
   * The gameserver's public IP address.
   */
  @Prop({ required: true, trim: true })
  address!: string;

  @Prop({ required: true })
  port!: string;

  @TransformObjectId()
  @Prop({ type: Types.ObjectId, ref: 'Game' })
  game?: GameId; // currently running game

  /**
   * The IP address of the gameserver's that the heartbeat came from.
   */
  @Prop()
  internalIpAddress!: string;

  @Prop({ required: true })
  rconPassword!: string;

  /**
   * Was the server online last time we checked?
   */
  @Prop({ default: false })
  isOnline!: boolean;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value }) => value.toISOString(), { toPlainOnly: true })
  @Prop({ default: () => new Date() })
  lastHeartbeatAt?: Date;

  @Prop({ default: 1 })
  priority!: number;
}

export const staticGameServerSchema =
  SchemaFactory.createForClass(StaticGameServer);
