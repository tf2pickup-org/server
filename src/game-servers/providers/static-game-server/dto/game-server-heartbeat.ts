import { IsNumberString, IsOptional, IsPort, IsString } from 'class-validator';

export class GameServerHeartbeat {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsPort()
  port: string;

  @IsString()
  rconPassword: string;

  @IsOptional()
  @IsNumberString()
  priority?: number;

  @IsOptional()
  @IsString()
  internalIpAddress?: string;
}
