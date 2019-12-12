import { prop, arrayProp } from '@typegoose/typegoose';

export class GameServer {
  @prop({ default: () => new Date() })
  createdAt?: Date;

  @prop({ required: true, trim: true })
  name!: string;

  @prop({ required: true, trim: true })
  address!: string;

  @prop({ required: true })
  port: number;

  @prop({ required: true })
  rconPassword!: string;

  @prop({ default: true })
  isAvailable: boolean; // is the server available for playing pickups

  @prop({ default: false })
  isOnline?: boolean; // was the server online last we checked

  @prop({ default: true })
  isFree: boolean; // is the server free to use (has any games running?)

  @arrayProp({ items: String })
  resolvedIpAddresses?: string[]; // trace log events

  @prop()
  mumbleChannelName?: string;
}
