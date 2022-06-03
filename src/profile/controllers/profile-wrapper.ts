import { Player } from '@/players/models/player';
import { PlayerBan } from '@/players/models/player-ban';
import { LinkedProfile } from '@/players/types/linked-profile';
import { Serializable } from '@/shared/serializable';
import { ProfileDto } from '../dto/profile.dto';

interface ProfileWrapperProps {
  player: Player;
  activeGameId?: string;
  bans: PlayerBan[];
  mapVote: string;
  preferences: Map<string, string>;
  linkedProfiles: LinkedProfile[];
}

export class ProfileWrapper extends Serializable<ProfileDto> {
  constructor(private readonly props: ProfileWrapperProps) {
    super();
  }

  async serialize(): Promise<ProfileDto> {
    return {
      player: this.props.player,
      hasAcceptedRules: this.props.player.hasAcceptedRules,
      activeGameId: this.props.activeGameId,
      bans: this.props.bans,
      mapVote: this.props.mapVote,
      preferences: Object.fromEntries(this.props.preferences),
      linkedProfiles: this.props.linkedProfiles,
    };
  }
}
