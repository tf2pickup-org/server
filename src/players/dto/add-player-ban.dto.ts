import { IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';

export class AddPlayerBanDto {
  @IsMongoId()
  player!: string;

  @IsMongoId()
  admin!: string;

  @IsDateString()
  start!: string;

  @IsDateString()
  end!: string;

  @IsOptional()
  @IsString()
  reason!: string;
}
