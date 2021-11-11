import { Module } from '@nestjs/common';
import { StatisticsService } from './services/statistics.service';
import { StatisticsController } from './controllers/statistics.controller';
import { Game, gameSchema } from '@/games/models/game';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
  ],
  providers: [StatisticsService],
  controllers: [StatisticsController],
})
export class StatisticsModule {}
