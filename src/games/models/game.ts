import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Document, Types } from 'mongoose';
import { GameSlot, gameSlotSchema } from './game-slot';
import { GameState } from './game-state';
import { SlotStatus } from './slot-status';

@Schema()
export class Game extends MongooseDocument {
  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id.toString())
  id: string;

  @Prop({ default: () => new Date() })
  launchedAt?: Date;

  @Prop({ required: true, unique: true })
  number!: number;

  @Type(() => GameSlot)
  @Prop({ type: [gameSlotSchema], required: true })
  slots!: GameSlot[];

  @Exclude({ toPlainOnly: true })
  @Type(() => Number)
  @Prop(
    raw({
      type: Map,
      of: Number,
    }),
  )
  assignedSkills?: Map<string, number>;

  @Prop({ required: true })
  map!: string;

  @Prop({ index: true, enum: GameState, default: GameState.launching })
  state?: GameState;

  @Exclude({ toPlainOnly: true })
  @Prop()
  connectString?: string;

  @Prop({ default: 0 })
  connectInfoVersion: number;

  @Prop()
  stvConnectString?: string;

  @Prop()
  logsUrl?: string;

  @Prop()
  demoUrl?: string;

  @Prop()
  error?: string;

  @Prop({ ref: 'GameServer' })
  gameServer?: Types.ObjectId;

  @Type(() => Number)
  @Prop(
    raw({
      type: Map,
      of: Number,
    }),
  )
  score?: Map<string, number>;

  @Exclude({ toPlainOnly: true })
  @Prop({ unique: true, sparse: true })
  logSecret?: string;

  findPlayerSlot(playerId: string): GameSlot {
    return this.slots.find((s) => s.player.equals(playerId));
  }

  activeSlots(): GameSlot[] {
    return this.slots.filter((slot) =>
      [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(
        slot.status,
      ),
    );
  }

  isInProgress(): boolean {
    return [GameState.launching, GameState.started].includes(this.state);
  }
}

export type GameDocument = Game & Document;
export const gameSchema = SchemaFactory.createForClass(Game);
