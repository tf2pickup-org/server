import { PlayerBanDto } from '@/players/dto/player-ban.dto';
import { PlayerDto } from '@/players/dto/player.dto';
import { LinkedProfile } from '@/players/types/linked-profile';
import { Serializable } from '@/shared/serializable';

export interface ProfileDto {
  player: Serializable<PlayerDto>;
  hasAcceptedRules: boolean;
  activeGameId: string;
  bans: Serializable<PlayerBanDto>[];
  mapVote: string;
  preferences: Record<string, string>;
  linkedProfiles: LinkedProfile[];
}
