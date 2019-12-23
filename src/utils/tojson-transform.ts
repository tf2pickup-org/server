import { Document } from 'mongoose';

export function renameId(doc: Document, ret: any) {
  if (ret._id && typeof ret._id === 'object' && ret._id.toString) {
    if (typeof ret.id === 'undefined') {
      ret.id = ret._id.toString();
    }
  }
  if (typeof ret._id !== 'undefined') {
    delete ret._id;
  }
}

export function removeRconPassword(doc: Document, ret: any) {
  if (ret.rconPassword) {
    delete ret.rconPassword;
  }
}

export function removeGameAssignedSkills(doc: Document, ret: any) {
  if (ret.assignedSkills) {
    delete ret.assignedSkills;
  }
}
