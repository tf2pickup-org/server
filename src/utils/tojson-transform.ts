import { Document } from 'mongoose';

type TransformFn = (doc: Document, ret: any) => any;

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
