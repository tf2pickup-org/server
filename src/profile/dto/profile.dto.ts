import { PlayerBanDto } from '@/players/dto/player-ban.dto';
import { PlayerDto } from '@/players/dto/player.dto';
import { LinkedProfile } from '@/players/types/linked-profile';
import { Serializable } from '@/shared/serializable';
import { Restriction } from '../interfaces/restriction';

export interface ProfileDto {
  player: Serializable<PlayerDto>;
  hasAcceptedRules: boolean;
  activeGameId?: string;
  bans: Serializable<PlayerBanDto>[];
  mapVote?: string;
  preferences: Record<string, string>;
  linkedProfiles: LinkedProfile[];

  // list of restrictions for this players
  restrictions: Restriction[];
}
