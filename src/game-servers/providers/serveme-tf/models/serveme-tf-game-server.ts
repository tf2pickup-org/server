import { GameServer } from '@/game-servers/models/game-server';
import { createRcon } from '@/utils/create-rcon';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, Type } from 'class-transformer';
import { Rcon } from 'rcon-client/lib';
import { toValidMumbleChannelName } from '../../static-game-server/utils/to-valid-mumble-channel-name';
import { Document } from 'mongoose';
import { app } from '@/app';
import { ServemeTfApiService } from '../services/serveme-tf-api.service';

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
export class ServemeTfGameServer extends GameServer {
  @Exclude({ toPlainOnly: true })
  @Type(() => ServemeTfReservation)
  @Prop({ type: servemeTfReservationSchema, _id: false })
  reservation: ServemeTfReservation;

  async rcon(): Promise<Rcon> {
    return await createRcon({
      host: this.address,
      port: parseInt(this.port, 10),
      rconPassword: this.reservation.rcon,
    });
  }

  async voiceChannelName(): Promise<string> {
    // TODO fix
    return toValidMumbleChannelName(this.name);
  }

  async getLogsecret(): Promise<string> {
    return this.reservation.logsecret;
  }

  async start(): Promise<this> {
    const servemeTfApiService = app.get(ServemeTfApiService);
    await servemeTfApiService.waitForServerToStart(this.reservation.id);
    return this;
  }
}

export type ServemeTfGameServerDocument = ServemeTfGameServer & Document;
export const servemeTfGameServerSchema =
  SchemaFactory.createForClass(ServemeTfGameServer);

export function isServemeTfGameServer(
  gameServer: GameServer,
): gameServer is ServemeTfGameServer {
  return gameServer.provider === 'serveme.tf';
}
