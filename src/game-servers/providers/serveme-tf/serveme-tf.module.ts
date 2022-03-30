import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ServemeTfService } from './services/serveme-tf.service';
import { ServemeTfApiService } from './services/serveme-tf-api.service';
import { GameServersModule } from '@/game-servers/game-servers.module';
import { servemeTfGameServerModelProvider } from './serveme-tf-game-server-model.provider';

@Module({
  imports: [HttpModule, forwardRef(() => GameServersModule)],
  providers: [
    ServemeTfService,
    ServemeTfApiService,
    servemeTfGameServerModelProvider,
  ],
})
export class ServemeTfModule {}
