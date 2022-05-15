import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import {
  Certificate,
  CertificateDocument,
  certificateSchema,
} from '../models/certificate';
import { CertificatesService } from './certificates.service';

describe('CertificatesService', () => {
  let service: CertificatesService;
  let mongod: MongoMemoryServer;
  let certificateModel: Model<CertificateDocument>;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: Certificate.name, schema: certificateSchema },
        ]),
      ],
      providers: [CertificatesService],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
    connection = module.get(getConnectionToken());
    certificateModel = module.get(getModelToken(Certificate.name));
  });

  afterEach(async () => {
    await certificateModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getCertificate()', () => {
    it('should create new certificate', async () => {
      expect(await certificateModel.countDocuments()).toEqual(0);
      await service.getCertificate('test');
      expect(await certificateModel.countDocuments()).toEqual(1);
    });

    it('should return stored certificate', async () => {
      const oldCertificate = await service.getCertificate('test');
      const newCertificate = await service.getCertificate('test');
      expect(oldCertificate.certificate).toEqual(newCertificate.certificate);
      expect(oldCertificate.clientKey).toEqual(newCertificate.clientKey);
    });
  });
});
