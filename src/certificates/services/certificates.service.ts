import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Error, Model } from 'mongoose';
import {
  CertificateCreationOptions,
  CertificateCreationResult,
  createCertificate as createCertificateCb,
} from 'pem';
import { Certificate } from '../models/certificate';

const createCertificate = (options: CertificateCreationOptions) =>
  new Promise<CertificateCreationResult>((resolve, reject) => {
    createCertificateCb(options, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });

@Injectable()
export class CertificatesService {
  constructor(
    @InjectModel(Certificate.name)
    private certificateModel: Model<Certificate>,
  ) {}

  async getCertificate(purpose: string): Promise<Certificate> {
    try {
      return plainToInstance(
        Certificate,
        await this.certificateModel.findOne({ purpose }).orFail().lean().exec(),
      );
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { clientKey, certificate } = await createCertificate({
          days: 356 * 10,
          selfSigned: true,
        });
        const { _id } = await this.certificateModel.create({
          purpose,
          clientKey,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          certificate,
        });
        return plainToInstance(
          Certificate,
          await this.certificateModel.findById(_id).orFail().lean().exec(),
        );
      } else {
        throw error;
      }
    }
  }
}
