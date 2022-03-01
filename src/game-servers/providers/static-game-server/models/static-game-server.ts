import { GameServer } from '@/game-servers/models/game-server';
import { GameServerProvider } from '@/game-servers/models/game-server-provider';
import { createRcon } from '@/utils/create-rcon';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
import { isEmpty } from 'lodash';
import { Document } from 'mongoose';
import { Rcon } from 'rcon-client';
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

  @Prop({ default: false })
  isOnline!: boolean; // was the server online last we checked

  @Prop({ default: true })
  isClean!: boolean; // is the server cleaned up after the last game

  @Prop({ default: () => new Date() })
  lastHeartbeatAt?: Date;

  @Prop({ default: 1 })
  priority!: number;

  @Prop()
  customVoiceChannelName?: string;

  async rcon(): Promise<Rcon> {
    return createRcon({
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
  return gameServer.provider === GameServerProvider.static;
}
