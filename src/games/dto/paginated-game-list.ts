import { Type } from 'class-transformer';
import { Game } from '../models/game';

interface PaginatedGameListProps {
  results: Game[];
  itemCount: number;
}

export class PaginatedGameList implements PaginatedGameListProps {
  constructor(props: PaginatedGameListProps) {
    this.results = props.results;
    this.itemCount = props.itemCount;
  }

  @Type(() => Game)
  results: Game[];

  itemCount: number;
}
