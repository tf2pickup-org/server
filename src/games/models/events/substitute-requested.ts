import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';
import { app } from '@/app';
import { GameEventDto } from '@/games/dto/game-event.dto';
import { PlayersService } from '@/players/services/players.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

@Schema()
export class SubstituteRequested extends GameEvent {
  event = GameEventType.substituteRequested;

  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  player!: PlayerId;

  @Prop({ required: true, enum: Tf2ClassName })
  gameClass!: Tf2ClassName;

  @TransformObjectId()
  @Prop({ type: Types.ObjectId, ref: 'Player' })
  actor?: PlayerId;

  @Prop()
  reason?: string;

  async serialize(): Promise<GameEventDto> {
    const playersService = app.get(PlayersService);
    return {
      event: this.event,
      at: this.at.toISOString(),
      player: await playersService.getById(this.player),
      gameClass: this.gameClass,
      actor: this.actor ? await playersService.getById(this.actor) : null,
      reason: this.reason,
    };
  }
}

export const substituteRequestedSchema =
  SchemaFactory.createForClass(SubstituteRequested);
