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
  @IsString()
  voiceChannelName?: string;

  @IsOptional()
  @IsNumberString()
  priority?: number;
}
