import { MessageEmbed } from 'discord.js';
import { Colors } from './colors';

interface GameServerOnlineOptions {
  gameServer: {
    name: string;
    address: string;
    port: string;
  };
  client: {
    name: string;
    iconUrl: string;
  };
}

export const gameServerOnline = (options: GameServerOnlineOptions) =>
  new MessageEmbed()
    .setColor(Colors.GameServerAdded)
    .setTitle('Game server is back online')
    .setDescription(
      [
        `Name: **${options.gameServer.name}**`,
        `Address: **${options.gameServer.address}:${options.gameServer.port}**`,
      ].join('\n'),
    )
    .setFooter(options.client.name, options.client.iconUrl)
    .setTimestamp();
