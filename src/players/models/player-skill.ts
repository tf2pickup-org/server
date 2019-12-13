import { prop, Ref, mapProp } from '@typegoose/typegoose';
import { Player } from './player';

export class PlayerSkill {

  @prop({ ref: 'Player' })
  player?: Ref<Player>;

  @mapProp({ of: Number })
  skill?: Map<string, number>;

}
