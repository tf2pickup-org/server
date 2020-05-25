import { ObjectIdValidationPipe } from './object-id-validation.pipe';
import { ObjectId } from 'mongodb';

describe('ObjectIdValidationPipe', () => {
  it('should be defined', () => {
    expect(new ObjectIdValidationPipe()).toBeDefined();
  });

  it('should pass valid object id', () => {
    const id = new ObjectId();
    expect(new ObjectIdValidationPipe().transform(id.toString())).toEqual(id);
  });

  it('should deny invalid object id',() => {
    expect(() => new ObjectIdValidationPipe().transform('some invalid id')).toThrow();
  });
});
