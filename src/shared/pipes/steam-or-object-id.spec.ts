import { ObjectId } from 'mongodb';
import { BadRequestException } from '@nestjs/common';
import { SteamOrObjectIdPipe } from './steam-or-object-id.pipe';

describe('SteamOrObjectIdPipe', () => {
  it('should be defined', () => {
    expect(new SteamOrObjectIdPipe()).toBeDefined();
  });

  describe('object id', () => {
    it('should pass valid object id', () => {
      const id = new ObjectId().toString();
      expect(new SteamOrObjectIdPipe().transform(id)).toEqual(id);
    });

    it('should deny invalid object id', () => {
      expect(() => new SteamOrObjectIdPipe().transform('4321abc')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('steam id', () => {
    it('should pass valid steam id 64', () => {
      const id = '76561198074409147';

      expect(new SteamOrObjectIdPipe().transform(id)).toEqual(id);
    });

    it('should pass valid steam id 0', () => {
      const id = 'STEAM_0:1:57071709';

      expect(new SteamOrObjectIdPipe().transform(id)).toEqual(id);
    });

    it('should pass valid steam id 3', () => {
      const id = '[U:1:114143419]';

      expect(new SteamOrObjectIdPipe().transform(id)).toEqual(id);
    });

    it('should deny invalid steam id', () => {
      expect(() => new SteamOrObjectIdPipe().transform('1234abc')).toThrow(
        BadRequestException,
      );
    });
  });
});
