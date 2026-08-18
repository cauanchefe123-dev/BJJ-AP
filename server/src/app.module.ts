import { Module } from '@nestjs/common';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';
import { PrismaModule } from './prisma/prisma.module.ts';
import { AcademiesModule } from './academies/academies.module.ts';
import { UsersModule } from './users/users.module.ts';
import { StudentsModule } from './students/students.module.ts';

@Module({
  imports: [
    PrismaModule,
    AcademiesModule,
    UsersModule,
    StudentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
