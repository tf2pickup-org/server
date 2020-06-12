import { MessageEmbedOptions } from 'discord.js';
import { Colors } from './colors';

interface NewPlayerFields {
  name: string;
  profileUrl: string;
}

export function newPlayer(fields: NewPlayerFields): MessageEmbedOptions {
  return {
    color: Colors.NewPlayer,
    title: 'New player',
    fields: [
      {
        name: 'Name',
        value: fields.name,
      },
    ],
    url: fields.profileUrl,
    timestamp: new Date(),
  };
}
