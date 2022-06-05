import {
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  BadRequestException,
  Body,
  Put,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Auth } from '@/auth/decorators/auth.decorator';
import { User } from '@/auth/decorators/user.decorator';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { MapVoteService } from '@/queue/services/map-vote.service';
import { PlayerPreferencesService } from '@/player-preferences/services/player-preferences.service';
import { LinkedProfilesService } from '@/players/services/linked-profiles.service';
import { Serializable } from '@/shared/serializable';
import { ProfileDto } from '../dto/profile.dto';
import { ProfileWrapper } from './profile-wrapper';

@Controller('profile')
export class ProfileController {
  constructor(
    private playersService: PlayersService,
    private playerBansService: PlayerBansService,
    private mapVoteService: MapVoteService,
    private playerPreferencesService: PlayerPreferencesService,
    private linkedProfilesService: LinkedProfilesService,
  ) {}

  @Get()
  @Auth()
  async getProfile(@User() user: Player): Promise<Serializable<ProfileDto>> {
    return new ProfileWrapper({
      player: user,
      activeGameId: user.activeGame?.toString() ?? undefined,
      bans: await this.playerBansService.getPlayerActiveBans(user.id),
      mapVote: this.mapVoteService.playerVote(user.id),
      preferences: await this.playerPreferencesService.getPlayerPreferences(
        user.id,
      ),
      linkedProfiles: await this.linkedProfilesService.getLinkedProfiles(
        user.id,
      ),
    });
  }

  @Auth()
  @Get('/preferences')
  async getPreferences(@User() user: Player) {
    return await this.playerPreferencesService.getPlayerPreferences(user.id);
  }

  @Auth()
  @Put('/preferences')
  async savePreferences(
    @User() user: Player,
    @Body() preferences: { [key: string]: string },
  ) {
    return await this.playerPreferencesService.updatePlayerPreferences(
      user.id,
      new Map(Object.entries(preferences)),
    );
  }

  @Post()
  @Auth()
  @UseInterceptors(ClassSerializerInterceptor)
  @HttpCode(204)
  async acceptTerms(
    @User() user: Player,
    @Query('accept_terms') acceptTerms: string,
  ) {
    if (acceptTerms !== undefined) {
      await this.playersService.acceptTerms(user.id);
    } else {
      throw new BadRequestException();
    }
  }
}
