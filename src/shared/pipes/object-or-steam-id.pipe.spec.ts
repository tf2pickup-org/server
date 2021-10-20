import { ObjectOrSteamIdPipe } from './object-or-steam-id.pipe';
import { ObjectId } from 'mongodb';
import { BadRequestException } from '@nestjs/common';

describe('ObjectOrSteamIdPipe', () => {
  it('should be defined', () => {
    expect(new ObjectOrSteamIdPipe()).toBeDefined();
  });

  describe('object id', () => {
    it('should pass valid object id', () => {
      const id = new ObjectId().toString();
      expect(new ObjectOrSteamIdPipe().transform(id)).toEqual(id);
    });

    it('should deny invalid object id', () => {
      expect(() =>
        new ObjectOrSteamIdPipe().transform('some invalid object id'),
      ).toThrow(BadRequestException);
    });
  });

  describe('steam id', () => {
    it('should pass valid steam id', () => {
      const id = '76561198074409147';

      expect(new ObjectOrSteamIdPipe().transform(id)).toEqual(id);
    });

    it('should deny invalid object id', () => {
      expect(() =>
        new ObjectOrSteamIdPipe().transform('some invalid steam id'),
      ).toThrow(BadRequestException);
    });
  });
});
