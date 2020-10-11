import { prop, mapProp } from '@typegoose/typegoose';

/**
 * Imported skills for players that have not registered their account yet.
 */
export class FuturePlayerSkill {

  @prop({ required: true, unique: true })
  steamId!: string;

  @prop({ type: Number })
  skill?: Map<string, number>;

}
