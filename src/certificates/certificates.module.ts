import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Certificate, certificateSchema } from './models/certificate';
import { CertificatesService } from './services/certificates.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Certificate.name, schema: certificateSchema },
    ]),
  ],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
