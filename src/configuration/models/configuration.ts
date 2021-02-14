import { prop } from "@typegoose/typegoose";

export class Configuration {

  @prop({ default: 1 })
  defaultPlayerSkill?: number;

  @prop()
  whitelistId?: string;

}
