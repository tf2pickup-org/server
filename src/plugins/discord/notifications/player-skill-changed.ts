import { MessageEmbed } from 'discord.js';
import { Colors } from './colors';
import { Player } from '@/players/models/player';

type PlayerSkillType = Player['skill'];

interface PlayerSkillChangedOptions {
  player: {
    name: string;
    profileUrl: string;
    avatarUrl: string;
  };
  admin: {
    name: string;
    profileUrl: string;
    avatarUrl: string;
  };
  client: {
    name: string;
    iconUrl: string;
  };
  oldSkill: PlayerSkillType;
  newSkill: PlayerSkillType;
}

const generateChangesText = (
  oldSkill: PlayerSkillType,
  newSkill: PlayerSkillType,
): string => {
  return Array.from(newSkill.keys())
    .filter((gameClass) => newSkill.get(gameClass) !== oldSkill.get(gameClass))
    .map(
      (gameClass) =>
        `${gameClass}: ${
          oldSkill.get(gameClass) ?? 'not set'
        } => **${newSkill.get(gameClass)}**`,
    )
    .join('\n');
};

export const playerSkillChanged = (options: PlayerSkillChangedOptions) =>
  new MessageEmbed()
    .setColor(Colors.SkillChanged)
    .setAuthor({
      name: options.admin.name,
      iconURL: options.admin.avatarUrl,
      url: options.admin.profileUrl,
    })
    .setTitle('Player skill updated')
    .setThumbnail(options.player.avatarUrl)
    .setDescription(
      `Player: **[${options.player.name}](${
        options.player.profileUrl
      })**\n${generateChangesText(options.oldSkill, options.newSkill)}`,
    )
    .setFooter({
      text: options.client.name,
      iconURL: options.client.iconUrl,
    })
    .setTimestamp();
