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
import { PlayerPreferencesService } from '@/player-preferences/services/player-preferences.service';
import { ProfileDto } from '../dto/profile.dto';
import { ProfileService } from '../services/profile.service';
import { isUndefined } from 'lodash';

@Controller('profile')
export class ProfileController {
  constructor(
    private playersService: PlayersService,
    private playerPreferencesService: PlayerPreferencesService,
    private profileService: ProfileService,
  ) {}

  @Get()
  @Auth()
  async getProfile(@User() user: Player): Promise<ProfileDto> {
    return await this.profileService.getProfile(user);
  }

  @Auth()
  @Get('/preferences')
  async getPreferences(@User() user: Player) {
    return Object.fromEntries(
      await this.playerPreferencesService.getPlayerPreferences(user._id),
    );
  }

  @Auth()
  @Put('/preferences')
  async savePreferences(
    @User() user: Player,
    @Body() preferences: { [key: string]: string },
  ) {
    return Object.fromEntries(
      await this.playerPreferencesService.updatePlayerPreferences(
        user._id,
        new Map(Object.entries(preferences)),
      ),
    );
  }

  @Post()
  @Auth()
  @UseInterceptors(ClassSerializerInterceptor)
  @HttpCode(204)
  async acceptTerms(
    @User() user: Player,
    @Query('accept_terms') acceptTerms?: string,
  ) {
    if (!isUndefined(acceptTerms)) {
      await this.playersService.acceptTerms(user._id);
    } else {
      throw new BadRequestException();
    }
  }
}
