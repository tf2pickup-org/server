import { Role } from 'discord.js';

export class RoleInfo {
  constructor(role: Role) {
    this.id = role.id;
    this.name = role.name;
    this.position = role.position;
  }

  id: string;
  name: string;
  position: number;
}
