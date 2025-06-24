import { Module, MiddlewareConsumer } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { AuthMiddleware } from '../auth/auth.middleware';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, { provide: 'PRISMA', useValue: new PrismaClient() }],
})
export class TransactionsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
