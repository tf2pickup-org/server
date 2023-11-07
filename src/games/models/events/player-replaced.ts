import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';
import { app } from '@/app';
import { GameEventDto } from '@/games/dto/game-event.dto';
import { PlayersService } from '@/players/services/players.service';

@Schema()
export class PlayerReplaced extends GameEvent {
  event = GameEventType.playerReplaced;

  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  replacee!: PlayerId;

  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  replacement!: PlayerId;

  async serialize(): Promise<GameEventDto> {
    const playersService = app.get(PlayersService);
    return {
      event: this.event,
      at: this.at.toISOString(),
      replacee: await playersService.getById(this.replacee),
      replacement: await playersService.getById(this.replacement),
    };
  }
}

export const playerReplacedSchema =
  SchemaFactory.createForClass(PlayerReplaced);
