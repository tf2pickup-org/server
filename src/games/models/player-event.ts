import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum PlayerEventType {
  replacesPlayer = 'replaces player',
  joinsGameServer = 'joins game server',
  joinsGameServerTeam = 'joins game server team',
  leavesGameServer = 'leaves game server',
}

@Schema()
export class PlayerEvent {
  @Prop({ required: true, default: () => new Date() })
  at!: Date;

  @Prop({ required: true })
  event!: PlayerEventType;
}

export const playerEventSchema = SchemaFactory.createForClass(PlayerEvent);
