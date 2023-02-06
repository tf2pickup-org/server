import { ObjectIdValidationPipe } from './object-id-validation.pipe';
import { Types } from 'mongoose';

describe('ObjectIdValidationPipe', () => {
  it('should be defined', () => {
    expect(new ObjectIdValidationPipe()).toBeDefined();
  });

  it('should pass valid object id', () => {
    const id = new Types.ObjectId().toString();
    expect(new ObjectIdValidationPipe().transform(id)).toEqual(
      new Types.ObjectId(id),
    );
  });

  it('should deny invalid object id', () => {
    expect(() =>
      new ObjectIdValidationPipe().transform('some invalid id'),
    ).toThrow();
  });
});
