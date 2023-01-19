import { IsNotEmpty, IsString } from 'class-validator';

export class SetConfigurationEntry {
  @IsString()
  key!: string;

  @IsNotEmpty()
  value: unknown;
}
