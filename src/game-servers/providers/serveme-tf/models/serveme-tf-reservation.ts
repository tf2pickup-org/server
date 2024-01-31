import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ReservationStatus } from './reservation-status';
import { ReservationId } from '@tf2pickup-org/serveme-tf-client';

@Schema()
class ServemeTfServer {
  @Prop()
  id!: number;

  @Prop()
  name!: string;

  @Prop()
  flag!: string;

  @Prop()
  ip!: string;

  @Prop()
  port!: string;

  @Prop()
  latitude!: number;

  @Prop()
  longitude!: number;
}

const servemeTfServerSchema = SchemaFactory.createForClass(ServemeTfServer);

@Schema()
export class ServemeTfReservation extends MongooseDocument {
  @Prop()
  startsAt!: Date;

  @Prop()
  endsAt!: Date;

  @Prop()
  serverId!: number;

  @Prop()
  password!: string;

  @Prop()
  rcon!: string;

  @Prop()
  tvPassword!: string;

  @Prop()
  tvRelayPassword!: string;

  @Prop({ enum: ReservationStatus, default: ReservationStatus.unknown })
  status!: ReservationStatus;

  @Prop({ type: Number })
  reservationId!: ReservationId;

  @Prop()
  logsecret!: string;

  @Prop()
  ended!: boolean;

  @Prop()
  steamId!: string;

  @Prop({ type: servemeTfServerSchema, _id: false })
  server!: ServemeTfServer;
}

export const servemeTfReservationSchema =
  SchemaFactory.createForClass(ServemeTfReservation);
