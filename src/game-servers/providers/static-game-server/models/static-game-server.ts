import { GameServer } from '@/game-servers/models/game-server';
import { createRcon } from '@/utils/create-rcon';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
import { isEmpty } from 'lodash';
import { Document } from 'mongoose';
import { Rcon } from 'rcon-client';
import { staticGameServerProviderName } from '../static-game-server-provider-name';
import { toValidMumbleChannelName } from '../utils/to-valid-mumble-channel-name';

@Schema()
export class StaticGameServer extends GameServer {
  /**
   * The IP address of the gameserver's that the heartbeat came from.
   */
  @Exclude({ toPlainOnly: true })
  @Prop()
  internalIpAddress: string;

  @Exclude({ toPlainOnly: true })
  @Prop({ required: true })
  rconPassword!: string;

  /**
   * Was the server online last time we checked?
   */
  @Prop({ default: false })
  isOnline!: boolean;

  /**
   * Is the server cleaned up after the last game?
   */
  @Prop({ default: true })
  isClean!: boolean;

  @Prop({ default: () => new Date() })
  lastHeartbeatAt?: Date;

  @Prop({ default: 1 })
  priority!: number;

  /**
   * Set by the sm_tf2pickuporg_voice_channel_name cvar.
   */
  @Prop()
  customVoiceChannelName?: string;

  async rcon(): Promise<Rcon> {
    return await createRcon({
      host: this.internalIpAddress,
      port: parseInt(this.port, 10),
      rconPassword: this.rconPassword,
    });
  }

  async voiceChannelName(): Promise<string> {
    return isEmpty(this.customVoiceChannelName)
      ? toValidMumbleChannelName(this.name)
      : this.customVoiceChannelName;
  }
}

export type StaticGameServerDocument = StaticGameServer & Document;
export const staticGameServerSchema =
  SchemaFactory.createForClass(StaticGameServer);

export function isStaticGameServer(
  gameServer: GameServer,
): gameServer is StaticGameServer {
  return gameServer.provider === staticGameServerProviderName;
}
