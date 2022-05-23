import { Serializer } from '@/shared/serializer';
import { Injectable } from '@nestjs/common';
import { PlayerDto } from '../dto/player.dto';
import { Player } from '../models/player';

@Injectable()
export class PlayerSerializerService extends Serializer<Player, PlayerDto> {
  async serialize(player: Player): Promise<PlayerDto> {
    return {
      id: player.id,
      name: player.name,
      steamId: player.steamId,
      joinedAt: player.joinedAt,
      avatar: {
        small: player.avatar.small,
        medium: player.avatar.medium,
        large: player.avatar.large,
      },
      roles: player.roles,
      etf2lProfileId: player.etf2lProfileId,
      _links: player._links,
    };
  }
}
