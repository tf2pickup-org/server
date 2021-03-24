import { MessageEmbed } from 'discord.js';
import { Colors } from './colors';

interface GameServerAddedOptions {
  admin: {
    name: string;
    profileUrl: string;
    avatarUrl: string;
  };
  gameServer: {
    name: string;
  };
  client: {
    name: string;
    iconUrl: string;
  };
}

export const gameServerAdded = (options: GameServerAddedOptions) => new MessageEmbed()
  .setColor(Colors.GameServerAdded)
  .setAuthor(options.admin.name, options.admin.avatarUrl, options.admin.profileUrl)
  .setTitle('Game server added')
  .setDescription(options.gameServer.name)
  .setFooter(options.client.name, options.client.iconUrl)
  .setTimestamp();
