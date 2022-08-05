import { svLogsecret } from '@/game-coordinator/utils/rcon-commands';
import { createRcon } from '@/utils/create-rcon';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import { Document, Types } from 'mongoose';
import { Rcon } from 'rcon-client';
import { generateLogsecret } from '../utils/generate-logsecret';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';

@Schema()
export class StaticGameServer {
  __v?: number;

  @TransformObjectId()
  _id?: Types.ObjectId;

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

  async rcon(): Promise<Rcon> {
    return await createRcon({
      host: this.internalIpAddress,
      port: parseInt(this.port, 10),
      rconPassword: this.rconPassword,
    });
  }

  async getLogsecret(): Promise<string> {
    const logsecret = generateLogsecret();
    let rcon: Rcon;
    try {
      rcon = await this.rcon();
      await rcon.send(svLogsecret(logsecret));
      return logsecret;
    } finally {
      await rcon?.end();
    }
  }
}

export type StaticGameServerDocument = StaticGameServer & Document;
export const staticGameServerSchema =
  SchemaFactory.createForClass(StaticGameServer);
