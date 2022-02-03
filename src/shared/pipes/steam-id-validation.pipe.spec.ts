import { BadRequestException } from '@nestjs/common';
import { SteamIdValidationPipe } from './steam-id-validation.pipe';

describe('SteamIdValidationPipe', () => {
  const malySteamId64 = '76561198074409147';
  let pipe: SteamIdValidationPipe;

  beforeEach(() => {
    pipe = new SteamIdValidationPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('given a valid SteamID64', () => {
    it('should pass and return the SteamID64', () => {
      expect(pipe.transform('76561198074409147')).toEqual(malySteamId64);
    });
  });

  describe('given a valid SteamID', () => {
    it('should pass and return the SteamID64', () => {
      expect(pipe.transform('STEAM_0:1:57071709')).toEqual(malySteamId64);
    });
  });

  describe('given an invalid SteamID', () => {
    it('should throw an exception', () => {
      expect(() => pipe.transform('invalidsteamid')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('given a valid SteamID, but not of a valid individual', () => {
    it('should throw an exception', () => {
      expect(() => pipe.transform('[U:1:46143802:10]')).toThrow(
        BadRequestException,
      );
    });
  });
});
