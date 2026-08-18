import { Module } from '@nestjs/common';
import { AcademiesService } from './academies.service.ts';
import { AcademiesController } from './academies.controller.ts';

@Module({
  controllers: [AcademiesController],
  providers: [AcademiesService],
  exports: [AcademiesService],
})
export class AcademiesModule {}
