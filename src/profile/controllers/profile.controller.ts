import { Controller, Get, Post, Query, HttpCode, BadRequestException } from '@nestjs/common';
import { Auth } from '@/auth/decorators/auth.decorator';
import { User } from '@/auth/decorators/user.decorator';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';

@Controller('profile')
export class ProfileController {

  constructor(
    private playersService: PlayersService,
  ) { }

  @Auth()
  @Get()
  getProfile(@User() user: Player) {
    return user;
  }

  @Auth()
  @Post()
  @HttpCode(204)
  async acceptTerms(@User() user: Player, @Query('accept_terms') acceptTerms: string) {
    if (acceptTerms !== undefined) {
      await this.playersService.acceptTerms(user._id);
    } else {
      throw new BadRequestException();
    }
  }

}
