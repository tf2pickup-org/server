import { prop, arrayProp, index, Ref } from '@typegoose/typegoose';
import { IsString, IsPort } from 'class-validator';
import { Game } from '@/games/models/game';

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

  @prop({ type: () => [String] })
  resolvedIpAddresses?: string[]; // for tracing game server logs

  @prop()
  mumbleChannelName?: string;

  @prop({ ref: () => Game })
  game?: Ref<Game>;

}
