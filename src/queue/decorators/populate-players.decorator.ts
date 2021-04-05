import { UseInterceptors } from '@nestjs/common';
import { PopulatePlayersInterceptor } from '../interceptors/populate-players.interceptor';

export const PopulatePlayers = () =>
  UseInterceptors(PopulatePlayersInterceptor);
