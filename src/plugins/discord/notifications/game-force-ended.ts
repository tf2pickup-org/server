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

export const gameForceEnded = (options: GameForceEndedOptions) => new MessageEmbed()
  .setColor(Colors.GameForceEnded)
  .setAuthor(options.admin.name, options.admin.avatarUrl, options.admin.profileUrl)
  .setTitle('Game force-ended')
  .setDescription(`Game number: **[${options.game.number}](${options.game.url})**`)
  .setFooter(options.client.name, options.client.iconUrl)
  .setTimestamp();
