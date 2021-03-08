import { prop, Ref } from '@typegoose/typegoose';
import { GameSlot } from './game-slot';
import { GameServer } from '@/game-servers/models/game-server';
import { GameState } from './game-state';

export class Game {
  id: string;

  @prop({ default: () => new Date() })
  launchedAt?: Date;

  @prop({ required: true, unique: true })
  number!: number;

  @prop({ type: () => [GameSlot], required: true })
  slots!: GameSlot[];

  @prop({ type: Number })
  assignedSkills?: Map<string, number>;

  @prop({ required: true })
  map!: string;

  @prop({ index: true, enum: GameState, default: GameState.launching })
  state?: GameState;

  @prop()
  connectString?: string;

  @prop()
  mumbleUrl?: string;

  @prop()
  logsUrl?: string;

  @prop()
  demoUrl?: string;

  @prop()
  error?: string;

  @prop({ ref: () => GameServer })
  gameServer?: Ref<GameServer>;

  @prop({ type: Number })
  score?: Map<string, number>;

  @prop()
  stvConnectString?: string;

  findPlayerSlot(playerId: string) {
    return this.slots.find(s => s.player.toString().localeCompare(playerId) === 0);
  }

  activeSlots() {
    return this.slots.filter(slot => slot.status.match(/active|waiting for substitute/));
  }

}
