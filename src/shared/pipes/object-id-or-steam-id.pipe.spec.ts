import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ObjectIdOrSteamIdPipe } from './object-id-or-steam-id.pipe';
import { ObjectIdValidationPipe } from './object-id-validation.pipe';
import { SteamIdValidationPipe } from './steam-id-validation.pipe';

describe('ObjectIdOrSteamIdPipe', () => {
  let pipe: ObjectIdOrSteamIdPipe;

  beforeEach(() => {
    pipe = new ObjectIdOrSteamIdPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('given a valid object id', () => {
    it('should return the object id', () => {
      const objectId = new Types.ObjectId().toString();
      expect(pipe.transform(objectId)).toEqual({
        type: 'object-id',
        objectId,
      });
    });
  });

  describe('given a valid steam id', () => {
    it('should return the id id', () => {
      const steamId64 = '76561197960287930';
      expect(pipe.transform('76561197960287930')).toEqual({
        type: 'steam-id',
        steamId64,
      });
    });
  });

  describe('given an invalid id', () => {
    it('should throw an exception', () => {
      expect(() => pipe.transform('wontwork')).toThrow(BadRequestException);
    });
  });
});
