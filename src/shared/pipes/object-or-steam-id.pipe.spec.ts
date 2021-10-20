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
        new ObjectOrSteamIdPipe().transform('4321abc'),
      ).toThrow(BadRequestException);
    });
  });

  describe('steam id', () => {
    it('should pass valid steam id 64', () => {
      const id = '76561198074409147';

      expect(new ObjectOrSteamIdPipe().transform(id)).toEqual(id);
    });

    it('should pass valid steam id 0', () => {
      const id = 'STEAM_0:1:57071709';

      expect(new ObjectOrSteamIdPipe().transform(id)).toEqual(id);
    });

    it('should pass valid steam id 3', () => {
      const id = '[U:1:114143419]';

      expect(new ObjectOrSteamIdPipe().transform(id)).toEqual(id);
    });

    it('should deny invalid steam id', () => {
      expect(() =>
        new ObjectOrSteamIdPipe().transform('1234abc'),
      ).toThrow(BadRequestException);
    });
  });
});
