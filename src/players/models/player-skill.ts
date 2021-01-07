import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { prop, Ref } from '@typegoose/typegoose';
import { Player } from './player';

export class PlayerSkill {

  @prop({ ref: () => Player })
  player?: Ref<Player>;

  @prop({ type: Number })
  skill?: Map<Tf2ClassName, number>;

}
