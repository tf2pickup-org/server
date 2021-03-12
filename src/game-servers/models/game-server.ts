import { isRefType, prop, Ref } from '@typegoose/typegoose';
import { Game } from '@/games/models/game';
import { MongooseDocument } from '@/utils/mongoose-document';
import { Exclude, Expose, Transform } from 'class-transformer';

export class GameServer extends MongooseDocument {

  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id?.toString())
  id?: string;

  @prop({ default: () => new Date() })
  createdAt?: Date;

  @prop({ required: true, trim: true })
  name!: string;

  @prop({ required: true, trim: true })
  address!: string;

  @prop({ required: true })
  port!: string;

  @Exclude({ toPlainOnly: true })
  @prop({ required: true })
  rconPassword!: string;

  @prop({ default: true })
  isAvailable?: boolean; // is the server available for playing pickups

  @prop({ default: false })
  isOnline?: boolean; // was the server online last we checked

  @prop({ type: () => [String], index: true })
  resolvedIpAddresses?: string[]; // for tracing game server logs

  @prop()
  mumbleChannelName?: string;

  @Transform(({ value }) => isRefType(value) ? value.toString() : value)
  @prop({ ref: () => Game })
  game?: Ref<Game>; // currently running game

}
