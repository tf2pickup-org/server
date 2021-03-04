import { prop } from "@typegoose/typegoose";
import { Exclude, Expose } from "class-transformer";

@Exclude()
export class PlayerAvatar {

  @Expose()
  @prop()
  small: string; // 32x32 px

  @Expose()
  @prop()
  medium: string; // 64x64 px

  @Expose()
  @prop()
  large: string; // 184x184 px

}
