import { Module } from '@nestjs/common';
import { StudentsService } from './students.service.ts';
import { StudentsController } from './students.controller.ts';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
