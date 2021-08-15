import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GameSlot, gameSlotSchema } from './game-slot';
import { GameState } from './game-state';

@Schema({
  toJSON: {
    versionKey: false,
    transform: function (doc: Document, ret: any) {
      if (ret._id && typeof ret._id === 'object' && ret._id.toString) {
        if (typeof ret.id === 'undefined') {
          ret.id = ret._id.toString();
        }
      }

      if (typeof ret._id !== 'undefined') {
        delete ret._id;
      }

      if (ret.assignedSkills) {
        delete ret.assignedSkills;
      }

      if (ret.logSecret) {
        delete ret.logSecret;
      }

      if (ret.connectString) {
        delete ret.connectString;
      }
    },
  },
})
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

  @Prop(
    raw({
      type: Map,
      of: Number,
    }),
  )
  score?: Map<string, number>;

  @Prop({ unique: true, sparse: true })
  logSecret?: string;

  findPlayerSlot: (playerId: string) => GameSlot;
  activeSlots: () => GameSlot[];
}

export type GameDocument = Game & Document;
export const gameSchema = SchemaFactory.createForClass(Game);

gameSchema.methods.findPlayerSlot = function (
  this: GameDocument,
  playerId: string,
): GameSlot {
  return this.slots.find(
    (s) => s.player.toString().localeCompare(playerId) === 0,
  );
};

gameSchema.methods.activeSlots = function (this: GameDocument): GameSlot[] {
  return this.slots.filter((slot) =>
    slot.status.match(/active|waiting for substitute/),
  );
};
