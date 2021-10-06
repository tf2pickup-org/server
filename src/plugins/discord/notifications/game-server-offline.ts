import { MessageEmbed } from 'discord.js';
import { Colors } from './colors';

interface GameServerOfflineOptions {
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

export const gameServerOffline = (options: GameServerOfflineOptions) =>
  new MessageEmbed()
    .setColor(Colors.GameServerRemoved)
    .setTitle('Game server is offline')
    .setDescription(
      [
        `Name: **${options.gameServer.name}**`,
        `Address: **${options.gameServer.address}:${options.gameServer.port}**`,
      ].join('\n'),
    )
    .setFooter(options.client.name, options.client.iconUrl)
    .setTimestamp();
