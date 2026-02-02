import { Module } from '@nestjs/common';
import { EducationalContentController } from './educational-content.controller';
import { EducationalContentService } from './educational-content.service';

@Module({
  controllers: [EducationalContentController],
  providers: [EducationalContentService],
  exports: [EducationalContentService],
})
export class EducationalContentModule {}
