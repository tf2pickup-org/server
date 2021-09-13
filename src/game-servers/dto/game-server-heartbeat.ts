import { IsPort, IsString } from 'class-validator';

export class GameServerHeartbeat {
  @IsString()
  name: string;

  @IsString()
  publicIpAddress: string;

  @IsPort()
  port: string;

  @IsString()
  rconPassword: string;
}
