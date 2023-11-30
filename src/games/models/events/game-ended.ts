import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';
import { PlayersService } from '@/players/services/players.service';
import { app } from '@/app';
import { GameEventDto } from '@/games/dto/game-event.dto';

export enum GameEndedReason {
  matchEnded = 'match ended',
  interrupted = 'interrupted',
}

@Schema()
export class GameEnded extends GameEvent {
  event = GameEventType.gameEnded;

  @Prop({ required: true, enum: GameEndedReason })
  reason!: GameEndedReason;

  @TransformObjectId()
  @Prop({ type: Types.ObjectId, ref: 'Player' })
  actor?: PlayerId;

  async serialize(): Promise<GameEventDto> {
    const playersService = app.get(PlayersService);
    return {
      event: this.event,
      at: this.at.toISOString(),
      reason: this.reason,
      actor: this.actor ? await playersService.getById(this.actor) : null,
    };
  }
}

export const gameEndedSchema = SchemaFactory.createForClass(GameEnded);
