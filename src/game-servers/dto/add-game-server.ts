import { IsPort, IsString } from 'class-validator';

export class AddGameServer {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsPort()
  port: string;

  @IsString()
  rconPassword: string;
}
