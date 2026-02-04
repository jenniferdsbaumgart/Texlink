import { Module } from '@nestjs/common';
import { BrandDocumentsController } from './brand-documents.controller';
import { BrandDocumentsService } from './brand-documents.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BrandDocumentsController],
  providers: [BrandDocumentsService],
  exports: [BrandDocumentsService],
})
export class BrandDocumentsModule {}
