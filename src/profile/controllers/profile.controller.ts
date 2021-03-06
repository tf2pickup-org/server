import { Controller, Get, Post, Query, HttpCode, BadRequestException, Body, Put, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { Auth } from '@/auth/decorators/auth.decorator';
import { User } from '@/auth/decorators/user.decorator';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { GamesService } from '@/games/services/games.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { MapVoteService } from '@/queue/services/map-vote.service';
import { PlayerPreferencesService } from '@/player-preferences/services/player-preferences.service';
import { Profile } from '../dto/profile';

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
  @UseInterceptors(ClassSerializerInterceptor)
  async getProfile(@User() user: Player): Promise<Profile> {
    return new Profile({
      player: user,
      activeGameId: (await this.gamesService.getPlayerActiveGame(user.id))?.id ?? null,
      bans: await this.playerBansService.getPlayerActiveBans(user.id),
      mapVote: this.mapVoteService.playerVote(user.id),
      preferences: await this.playerPreferencesService.getPlayerPreferences(user.id),
    });
  }

  @Auth()
  @Get('/preferences')
  async getPreferences(@User() user: Player) {
    return this.playerPreferencesService.getPlayerPreferences(user.id);
  }

  @Auth()
  @Put('/preferences')
  async savePreferences(@User() user: Player, @Body() preferences: { [key: string]: string }) {
    return this.playerPreferencesService.updatePlayerPreferences(user.id, new Map(Object.entries(preferences)));
  }

  @Post()
  @Auth()
  @UseInterceptors(ClassSerializerInterceptor)
  @HttpCode(204)
  async acceptTerms(@User() user: Player, @Query('accept_terms') acceptTerms: string) {
    if (acceptTerms !== undefined) {
      await this.playersService.acceptTerms(user.id);
    } else {
      throw new BadRequestException();
    }
  }

}
