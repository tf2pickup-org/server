import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GameSlot, gameSlotSchema } from './game-slot';
import { GameState } from './game-state';

@Schema()
export class Game {
  id: string;

  @Prop({ default: () => new Date() })
  launchedAt?: Date;

  @Prop({ required: true, unique: true })
  number!: number;

  @Prop({ type: [gameSlotSchema], required: true })
  slots!: GameSlot[];

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

  @Prop()
  connectString?: string;

  @Prop()
  mumbleUrl?: string;

  @Prop()
  logsUrl?: string;

  @Prop()
  demoUrl?: string;

  @Prop()
  error?: string;

  @Prop({ ref: 'GameServer' })
  gameServer?: Types.ObjectId;

  @Prop(
    raw({
      type: Map,
      of: Number,
    }),
  )
  score?: Map<string, number>;

  @Prop()
  stvConnectString?: string;

  findPlayerSlot(playerId: string) {
    return this.slots.find(
      (s) => s.player.toString().localeCompare(playerId) === 0,
    );
  }

  activeSlots() {
    return this.slots.filter((slot) =>
      slot.status.match(/active|waiting for substitute/),
    );
  }
}

export type GameDocument = Game & Document;
export const gameSchema = SchemaFactory.createForClass(Game);
