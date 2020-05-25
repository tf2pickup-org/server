import { Controller, Get, Post, Query, HttpCode, BadRequestException } from '@nestjs/common';
import { Auth } from '@/auth/decorators/auth.decorator';
import { User } from '@/auth/decorators/user.decorator';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { GamesService } from '@/games/services/games.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { MapVoteService } from '@/queue/services/map-vote.service';
import { ObjectId } from 'mongodb';

@Controller('profile')
export class ProfileController {

  constructor(
    private playersService: PlayersService,
    private gamesService: GamesService,
    private playerBansService: PlayerBansService,
    private mapVoteService: MapVoteService,
  ) { }

  @Auth()
  @Get()
  async getProfile(@User() user: Player) {
    const userId = new ObjectId(user.id);
    const activeGameId = (await this.gamesService.getPlayerActiveGame(userId))?.id ?? null;
    const bans = await this.playerBansService.getPlayerActiveBans(userId);
    const mapVote = this.mapVoteService.playerVote(userId);
    return { ...user, activeGameId, bans, mapVote };
  }

  @Auth()
  @Post()
  @HttpCode(204)
  async acceptTerms(@User() user: Player, @Query('accept_terms') acceptTerms: string) {
    if (acceptTerms !== undefined) {
      await this.playersService.acceptTerms(new ObjectId(user.id));
    } else {
      throw new BadRequestException();
    }
  }

}
