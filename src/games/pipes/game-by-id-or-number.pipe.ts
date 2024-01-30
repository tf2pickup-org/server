import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { Game } from '../models/game';
import { GamesService } from '../services/games.service';
import { Error } from 'mongoose';
import { GameId } from '../types/game-id';

@Injectable()
export class GameByIdOrNumberPipe implements PipeTransform {
  private objectIdValidationPipe = new ObjectIdValidationPipe();

  constructor(private readonly gamesService: GamesService) {}

  async transform(value: string): Promise<Game> {
    try {
      const objectId = this.objectIdValidationPipe.transform(value) as GameId;
      return await this.gamesService.getById(objectId);
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        throw new NotFoundException();
      }
    }

    try {
      const gameNumber = parseInt(value);
      if (!isNaN(gameNumber)) {
        return await this.gamesService.getByNumber(gameNumber);
      } else {
        throw new NotFoundException();
      }
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        throw new NotFoundException();
      } else {
        throw error;
      }
    }
  }
}
