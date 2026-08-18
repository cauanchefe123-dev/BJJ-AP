import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Dynamically resolve DATABASE_URL from Postgres environment variables if not explicitly provided
    let databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl && process.env.SQL_HOST && process.env.SQL_DB_NAME) {
      const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'postgres';
      const pass = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || '';
      const host = process.env.SQL_HOST;
      const db = process.env.SQL_DB_NAME;
      const port = process.env.SQL_PORT || '5432';
      databaseUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}?schema=public`;
      process.env.DATABASE_URL = databaseUrl;
    }

    super({
      log: ['error', 'warn'],
      ...(databaseUrl
        ? {
            datasources: {
              db: {
                url: databaseUrl,
              },
            },
          }
        : {}),
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma ORM conectado ao PostgreSQL com sucesso.');
    } catch (error: any) {
      this.logger.warn(`Aviso de conexão do Prisma ORM (offline-first fallback ativo): ${error?.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexão do Prisma ORM encerrada.');
  }
}
