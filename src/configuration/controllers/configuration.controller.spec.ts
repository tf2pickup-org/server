import { Test, TestingModule } from '@nestjs/testing';
import { ConfigurationService } from '../services/configuration.service';
import { ConfigurationController } from './configuration.controller';

jest.mock('../services/configuration.service', () => ({
  ConfigurationService: jest.fn().mockImplementation(() => {
    const mockConfiguration = new Map();
    return {
      get: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve(mockConfiguration.get(key));
      }),
      set: jest.fn().mockImplementation((key: string, value: unknown) => {
        mockConfiguration.set(key, value);
        return Promise.resolve(value);
      }),
      describe: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve({
          key,
          value: mockConfiguration.get(key),
        });
      }),
      describeAll: jest.fn().mockImplementation(() =>
        Promise.resolve(
          Array.from(mockConfiguration.keys()).map((key) => ({
            key,
            value: mockConfiguration.get(key),
          })),
        ),
      ),
    };
  }),
}));

describe('ConfigurationController', () => {
  let controller: ConfigurationController;
  let configurationService: jest.Mocked<ConfigurationService>;

  beforeEach(() => {
    (
      ConfigurationService as jest.MockedClass<typeof ConfigurationService>
    ).mockClear();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigurationController],
      providers: [ConfigurationService],
    }).compile();

    controller = module.get<ConfigurationController>(ConfigurationController);
    configurationService = module.get(ConfigurationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#get()', () => {
    beforeEach(() => {
      configurationService.set('test.entry1', 'FAKE_VALUE_1');
      configurationService.set('test.entry2', 'FAKE_VALUE_2');
      configurationService.set('test.entry3', 'FAKE_VALUE_3');
    });

    describe('for selected keys', () => {
      it('should return selected entries', async () => {
        expect(await controller.get(['test.entry1', 'test.entry2'])).toEqual([
          expect.objectContaining({
            key: 'test.entry1',
            value: 'FAKE_VALUE_1',
          }),
          expect.objectContaining({
            key: 'test.entry2',
            value: 'FAKE_VALUE_2',
          }),
        ]);
      });
    });

    describe('for no selected keys', () => {
      it('should return all entries', async () => {
        expect(await controller.get()).toEqual([
          expect.objectContaining({
            key: 'test.entry1',
            value: 'FAKE_VALUE_1',
          }),
          expect.objectContaining({
            key: 'test.entry2',
            value: 'FAKE_VALUE_2',
          }),
          expect.objectContaining({
            key: 'test.entry3',
            value: 'FAKE_VALUE_3',
          }),
        ]);
      });
    });
  });

  describe('#set()', () => {
    it('should set all given entries', async () => {
      await controller.set([
        {
          key: 'test.entry1',
          value: 'NEW_VALUE_1',
        },
        {
          key: 'test.entry2',
          value: 'NEW_VALUE_2',
        },
      ]);
      expect(configurationService.set).toHaveBeenCalledWith(
        'test.entry1',
        'NEW_VALUE_1',
      );
      expect(configurationService.set).toHaveBeenCalledWith(
        'test.entry2',
        'NEW_VALUE_2',
      );
    });
  });
});
