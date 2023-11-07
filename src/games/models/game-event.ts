import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEventType } from './game-event-type';
import { Serializable } from '@/shared/serializable';
import { GameEventDto } from '../dto/game-event.dto';

@Schema({ discriminatorKey: 'event' })
export class GameEvent extends Serializable<GameEventDto> {
  event!: GameEventType;

  @Prop({ required: true, default: () => new Date() })
  at!: Date;

  serialize(): GameEventDto | Promise<GameEventDto> {
    return {
      event: this.event,
      at: this.at.toISOString(),
    };
  }
}

export const gameEventSchema = SchemaFactory.createForClass(GameEvent);
