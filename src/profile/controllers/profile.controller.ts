import { Controller, Get, Post, Query, HttpCode, BadRequestException, Body, Put, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { Auth } from '@/auth/decorators/auth.decorator';
import { User } from '@/auth/decorators/user.decorator';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { GamesService } from '@/games/services/games.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { MapVoteService } from '@/queue/services/map-vote.service';
import { PlayerPreferencesService } from '@/player-preferences/services/player-preferences.service';

@Controller('profile')
export class ProfileController {

  constructor(
    private playersService: PlayersService,
    private gamesService: GamesService,
    private playerBansService: PlayerBansService,
    private mapVoteService: MapVoteService,
    private playerPreferencesService: PlayerPreferencesService,
  ) { }

  @Get()
  @Auth()
  async getProfile(@User() user: Player) {
    const activeGameId = (await this.gamesService.getPlayerActiveGame(user._id))?.id ?? null;
    const bans = await this.playerBansService.getPlayerActiveBans(user._id);
    const mapVote = this.mapVoteService.playerVote(user._id);
    const preferences = await this.playerPreferencesService.getPlayerPreferences(user._id);
    return { ...user, activeGameId, bans, mapVote, preferences };
  }

  @Auth()
  @Get('/preferences')
  async getPreferences(@User() user: Player) {
    return this.playerPreferencesService.getPlayerPreferences(user._id);
  }

  @Auth()
  @Put('/preferences')
  async savePreferences(@User() user: Player, @Body() preferences: { [key: string]: string }) {
    return this.playerPreferencesService.updatePlayerPreferences(user._id, new Map(Object.entries(preferences)));
  }

  @Post()
  @Auth()
  @UseInterceptors(ClassSerializerInterceptor)
  @HttpCode(204)
  async acceptTerms(@User() user: Player, @Query('accept_terms') acceptTerms: string) {
    if (acceptTerms !== undefined) {
      await this.playersService.acceptTerms(user._id);
    } else {
      throw new BadRequestException();
    }
  }

}
