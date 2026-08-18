import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.ts';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('NestBootstrap');
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const port = process.env.NEST_PORT || 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`BJJ Cron NestJS API em execução na porta ${port}`);
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error('Falha ao inicializar a aplicação NestJS:', err);
  });
}

export { bootstrap };
