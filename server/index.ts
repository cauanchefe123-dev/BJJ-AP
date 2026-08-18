import { bootstrap } from './src/main.ts';

export * from './src/app.module.ts';
export * from './src/prisma/prisma.service.ts';
export * from './src/academies/academies.service.ts';
export * from './src/users/users.service.ts';
export * from './src/students/students.service.ts';

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error('Falha na inicialização do servidor NestJS:', err);
  });
}
