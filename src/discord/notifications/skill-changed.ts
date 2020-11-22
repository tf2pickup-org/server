import { MessageEmbedOptions, EmbedFieldData } from 'discord.js';
import { Colors } from './colors';

interface SkillChangedFields {
  playerName: string;
  oldSkill: Map<string, number>;
  newSkill: Map<string, number>;
  playerProfileUrl: string;
  adminResponsible: string;
}

function generateSkillFields(oldSkill: Map<string, number>, newSkill: Map<string, number>): EmbedFieldData[] {
  return Array.from(newSkill)
    .map(([className, newSkillValue]) => ({ className, newSkillValue, oldSkillValue : oldSkill.get(className) ?? 1 }))
    .filter(e => e.oldSkillValue !== e.newSkillValue)
    .map(e => ({ name: e.className, value: `${e.oldSkillValue} => ${e.newSkillValue}` }));
}

export function skillChanged(fields: SkillChangedFields): MessageEmbedOptions {
  const embed: MessageEmbedOptions = {
    color: Colors.SkillChanged,
    title: `Player's skill has been updated by ${fields.adminResponsible}`,
    fields: [
      {
        name: 'Player',
        value: `[${fields.playerName}](${fields.playerProfileUrl})`,
      },
      ...generateSkillFields(fields.oldSkill, fields.newSkill),
    ],
    timestamp: new Date(),
  };

  return embed;
}
