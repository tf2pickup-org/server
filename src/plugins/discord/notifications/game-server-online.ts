import { EmbedBuilder } from 'discord.js';
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
  new EmbedBuilder()
    .setColor(Colors.GameServerAdded)
    .setTitle('Game server is back online')
    .setDescription(
      [
        `Name: **${options.gameServer.name}**`,
        `Address: **${options.gameServer.address}:${options.gameServer.port}**`,
      ].join('\n'),
    )
    .setFooter({
      text: options.client.name,
      iconURL: options.client.iconUrl,
    })
    .setTimestamp();
