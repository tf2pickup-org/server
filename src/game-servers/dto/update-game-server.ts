import { Optional } from '@nestjs/common';
import { IsPort, IsString } from 'class-validator';

export class UpdateGameServer {
  @Optional()
  @IsString()
  name?: string;

  @Optional()
  @IsString()
  address?: string;

  @Optional()
  @IsPort()
  port?: string;

  @Optional()
  @IsString()
  rconPassword?: string;
}
