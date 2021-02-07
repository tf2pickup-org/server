import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Emoji, MessageEmbedOptions } from 'discord.js';
import { Colors } from './colors';

interface QueuePreviewGameClassData {
  gameClass: Tf2ClassName;
  emoji: Emoji;
  players: { name: string; }[];
  playersRequired: number;
}

interface QueuePreviewOptions {
  iconUrl: string;
  clientName: string;
  gameClassData: QueuePreviewGameClassData[];
}

export const queuePreview = (options: QueuePreviewOptions): MessageEmbedOptions => ({
  color: Colors.QueuePreview,
  title: `Join ${options.clientName} to play the next game!`,
  thumbnail: {
    url: options.iconUrl,
  },
  fields: options.gameClassData.map(gameClassData => ({
    name: `${gameClassData.emoji} ${gameClassData.gameClass} (${gameClassData.players.length}/${gameClassData.playersRequired})`,
    value: gameClassData.players
      .map(player => `${gameClassData.emoji} ${player.name}`)
      .join('\n'),
    inline: true,
  })),
  footer: {
    iconURL: options.iconUrl,
    text: options.clientName,
  },
  timestamp: new Date(),
});
