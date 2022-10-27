import { Serializable } from '@/shared/serializable';
import { PlayerSkillDto } from '../dto/player-skill.dto';
import { Player } from '../models/player';

export class PlayerSkillWrapper extends Serializable<PlayerSkillDto> {
  constructor(public readonly player: Player) {
    super();
  }

  serialize(): PlayerSkillDto {
    return {
      ...this.player.serialize(),
      skill: this.player.skill ? Object.fromEntries(this.player.skill) : {},
    };
  }
}
