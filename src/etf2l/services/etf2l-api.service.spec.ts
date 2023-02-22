import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { Etf2lApiService } from './etf2l-api.service';

jest.mock('@nestjs/axios');

describe('Etf2lApiService', () => {
  let service: Etf2lApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Etf2lApiService, HttpService],
    }).compile();

    service = module.get<Etf2lApiService>(Etf2lApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
