import { MessageEmbed } from 'discord.js';
import { Colors } from './colors';

interface GameForceEndedOptions {
  admin: {
    name: string;
    profileUrl: string;
    avatarUrl: string;
  };
  client: {
    name: string;
    iconUrl: string;
  };
  game: {
    number: string;
    url: string;
  };
}

export const gameForceEnded = (options: GameForceEndedOptions) =>
  new MessageEmbed()
    .setColor(Colors.GameForceEnded)
    .setAuthor({
      name: options.admin.name,
      iconURL: options.admin.avatarUrl,
      url: options.admin.profileUrl,
    })
    .setTitle('Game force-ended')
    .setDescription(
      `Game number: **[${options.game.number}](${options.game.url})**`,
    )
    .setFooter({
      text: options.client.name,
      iconURL: options.client.iconUrl,
    })
    .setTimestamp();
