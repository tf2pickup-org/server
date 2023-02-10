import { IsString } from 'class-validator';

export class GameServerOptionIdentifier {
  @IsString()
  id!: string;

  @IsString()
  provider!: string;
}
