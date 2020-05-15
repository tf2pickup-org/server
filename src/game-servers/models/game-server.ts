import { prop, arrayProp, index } from '@typegoose/typegoose';
import { IsString, IsPort } from 'class-validator';

@index({ resolvedIpAddresses: 1 })
export class GameServer {
  @prop({ default: () => new Date() })
  createdAt?: Date;

  @IsString()
  @prop({ required: true, trim: true })
  name!: string;

  @IsString()
  @prop({ required: true, trim: true })
  address!: string;

  @IsPort()
  @prop({ required: true })
  port!: string;

  @IsString()
  @prop({ required: true })
  rconPassword!: string;

  @prop({ default: true })
  isAvailable?: boolean; // is the server available for playing pickups

  @prop({ default: false })
  isOnline?: boolean; // was the server online last we checked

  @prop({ default: true })
  isFree?: boolean; // is the server free to use (has any games running?)

  @arrayProp({ items: String })
  resolvedIpAddresses?: string[]; // for tracing game server logs

  @prop()
  mumbleChannelName?: string;
}
