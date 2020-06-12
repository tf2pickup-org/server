import { MessageEmbedOptions } from 'discord.js';
import { Colors } from './colors';

interface SkillChangedFields {
  playerName: string;
  oldSkill: Map<string, number>;
  newSkill: Map<string, number>;
  playerProfileUrl: string;
}

export function skillChanged(fields: SkillChangedFields): MessageEmbedOptions {
  const embed: MessageEmbedOptions = {
    color: Colors.SkillChanged,
    title: 'Player\s skill has been updated',
    fields: [
      {
        name: 'Player name',
        value: `[${fields.playerName}](${fields.playerProfileUrl})`,
      },
    ],
    timestamp: new Date(),
  };

  for (const key of fields.newSkill.keys()) {
    const newSkillValue = fields.newSkill.get(key);
    const oldSkillValue = fields.oldSkill.get(key) || 1;

    if (newSkillValue !== oldSkillValue) {
      embed.fields.push({ name: key, value: `${oldSkillValue} => ${newSkillValue}` });
    }
  }

  return embed;
}
