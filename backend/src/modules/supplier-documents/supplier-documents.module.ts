import { Module } from '@nestjs/common';
import { SupplierDocumentsController } from './supplier-documents.controller';
import { SupplierDocumentsService } from './supplier-documents.service';

@Module({
    controllers: [SupplierDocumentsController],
    providers: [SupplierDocumentsService],
    exports: [SupplierDocumentsService],
})
export class SupplierDocumentsModule {}
