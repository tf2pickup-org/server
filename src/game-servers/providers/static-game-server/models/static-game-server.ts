import { GameServer } from '@/game-servers/models/game-server';
import { GameServerProvider } from '@/game-servers/models/game-server-provider';
import { createRcon } from '@/utils/create-rcon';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
import { Document } from 'mongoose';
import { Rcon } from 'rcon-client/lib';

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

  async rcon(): Promise<Rcon> {
    return createRcon({
      host: this.internalIpAddress,
      port: parseInt(this.port, 10),
      rconPassword: this.rconPassword,
    });
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
