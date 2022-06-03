import { Game } from '../models/game';

export interface PaginatedGameListDto {
  results: Game[];
  itemCount: number;
}
