import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      name: 'BJJ Cron NestJS API',
      version: '2.0.0',
      status: 'healthy',
      database: 'PostgreSQL + Prisma ORM',
      timestamp: new Date().toISOString(),
    };
  }
}
