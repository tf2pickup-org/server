import { Serializable } from '@/shared/serializable';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameServerDto } from '../dto/game-server.dto';

@Schema()
export class GameServer extends Serializable<GameServerDto> {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  connectString?: string;

  @Prop()
  stvConnectString?: string;

  async serialize(): Promise<GameServerDto> {
    return {
      name: this.name,
      connectString: this.connectString,
      stvConnectString: this.stvConnectString,
    };
  }
}

export const gameServerSchema = SchemaFactory.createForClass(GameServer);
