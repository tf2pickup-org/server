import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class GameServer {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  port: number;
}

export const gameServerSchema = SchemaFactory.createForClass(GameServer);
