import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class GameServer {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true, trim: true })
  name: string;
}

export const gameServerSchema = SchemaFactory.createForClass(GameServer);
