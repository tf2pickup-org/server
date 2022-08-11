import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, Transform, Type } from 'class-transformer';
import { Document } from 'mongoose';
import { MongooseDocument } from '@/utils/mongoose-document';

@Schema()
class ServemeTfReservation {
  @Prop()
  id: number;

  @Prop()
  startsAt: Date;

  @Prop()
  endsAt: Date;

  @Prop()
  serverId: number;

  @Prop()
  password: string;

  @Prop()
  rcon: string;

  @Prop()
  logsecret: string;

  @Prop()
  steamId: string;
}

const servemeTfReservationSchema =
  SchemaFactory.createForClass(ServemeTfReservation);

@Schema()
export class ServemeTfGameServer extends MongooseDocument {
  @Transform(({ value, obj }) => value ?? obj._id?.toString())
  id!: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true })
  port: string;

  @Exclude({ toPlainOnly: true })
  @Type(() => ServemeTfReservation)
  @Prop({ type: servemeTfReservationSchema, _id: false })
  reservation: ServemeTfReservation;
}

export type ServemeTfGameServerDocument = ServemeTfGameServer & Document;
export const servemeTfGameServerSchema =
  SchemaFactory.createForClass(ServemeTfGameServer);
