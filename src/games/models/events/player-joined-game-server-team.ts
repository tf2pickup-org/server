import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';
import { PlayerId } from '@/players/types/player-id';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Types } from 'mongoose';

@Schema()
export class PlayerJoinedGameServerTeam extends GameEvent {
  event = GameEventType.playerJoinedGameServerTeam;

  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  player!: PlayerId;
}

export const playerJoinedGameServerTeamSchema = SchemaFactory.createForClass(
  PlayerJoinedGameServerTeam,
);
