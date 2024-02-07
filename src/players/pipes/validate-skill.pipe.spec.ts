import { QueueConfig } from '@/queue-config/types/queue-config';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { BadRequestException } from '@nestjs/common';
import { ValidateSkillPipe } from './validate-skill.pipe';

const queueConfig: QueueConfig = {
  teamCount: 2,
  classes: [
    {
      name: Tf2ClassName.scout,
      count: 2,
    },
    {
      name: Tf2ClassName.soldier,
      count: 2,
    },
    {
      name: Tf2ClassName.demoman,
      count: 1,
    },
    {
      name: Tf2ClassName.medic,
      count: 1,
    },
  ],
};

describe('ValidateSkillPipe', () => {
  let pipe: ValidateSkillPipe;

  beforeEach(() => {
    pipe = new ValidateSkillPipe(queueConfig);
  });

  it('should be defined', () => {
    expect(queueConfig).toBeDefined();
  });

  describe('#transform()', () => {
    describe('when passing not an object', () => {
      it('should reject', () => {
        expect(() => pipe.transform(5)).toThrow(BadRequestException);
        expect(() => pipe.transform('a')).toThrow(BadRequestException);
        expect(() => pipe.transform(null)).toThrow(BadRequestException);
      });
    });

    describe('when passing an invalid skill', () => {
      it('should reject', () => {
        expect(() =>
          pipe.transform({
            [Tf2ClassName.scout]: 5,
            [Tf2ClassName.soldier]: 4,
            [Tf2ClassName.demoman]: 3,
            // no skill for medic
          }),
        ).toThrow(BadRequestException);

        expect(() =>
          pipe.transform({
            [Tf2ClassName.scout]: 5,
            [Tf2ClassName.soldier]: 4,
            [Tf2ClassName.demoman]: '3',
            [Tf2ClassName.medic]: 2,
          }),
        ).toThrow(BadRequestException);
      });
    });

    it('should pass', () => {
      const skill = {
        [Tf2ClassName.scout]: 5,
        [Tf2ClassName.soldier]: 4,
        [Tf2ClassName.demoman]: 3,
        [Tf2ClassName.medic]: 2,
      };
      expect(pipe.transform(skill)).toEqual(skill);
    });
  });
});
