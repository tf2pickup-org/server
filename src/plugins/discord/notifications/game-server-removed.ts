import { MessageEmbed } from 'discord.js';
import { Colors } from './colors';

interface GameServerRemovedOptions {
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

export const gameServerRemoved = (options: GameServerRemovedOptions) => new MessageEmbed()
  .setColor(Colors.GameServerRemoved)
  .setAuthor(options.admin.name, options.admin.avatarUrl, options.admin.profileUrl)
  .setTitle('Game server removed')
  .setDescription(options.gameServer.name)
  .setFooter(options.client.name, options.client.iconUrl)
  .setTimestamp();
