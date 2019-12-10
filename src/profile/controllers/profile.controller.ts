import { Controller, Get } from '@nestjs/common';
import { Auth } from '@/auth/auth.decorator';
import { User } from '@/auth/user.decorator';
import { Player } from '@/players/models/player';

@Controller('profile')
export class ProfileController {

  @Auth()
  @Get()
  getProfile(@User() user: Player) {
    return user;
  }

}
