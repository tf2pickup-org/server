import { renameId } from './tojson-transform';
import { Document } from 'mongoose';

type TransformFn = (doc: Document, ret: any) => any;

function chain(...transformFunctions: TransformFn[]): TransformFn {
  return (doc: Document, ret: any) =>
    transformFunctions.forEach((fn) => fn(doc, ret));
}

export function standardSchemaOptions(cls: any, ...transform: TransformFn[]) {
  return {
    typegooseClass: cls,
    schemaOptions: {
      toJSON: {
        versionKey: false,
        transform: chain(renameId, ...transform),
      },
    },
  };
}
