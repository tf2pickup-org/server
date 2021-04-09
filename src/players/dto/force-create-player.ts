import { IsString, Matches } from 'class-validator';

export class ForceCreatePlayer {
  @IsString()
  name: string;

  @Matches(/^\d{17}$/)
  steamId: string;
}
