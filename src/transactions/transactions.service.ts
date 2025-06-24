import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  private prisma = new PrismaClient();

  async create(data: Prisma.TransactionCreateInput) {
    return this.prisma.transaction.create({ data });
  }

  async findAll(userId: string, filters: Partial<Pick<Prisma.TransactionWhereInput, 'type' | 'category'>>) {
    return this.prisma.transaction.findMany({ where: { userId, ...filters } });
  }

  async summary(userId: string) {
    return this.prisma.transaction.groupBy({
      by: ['type', 'category'],
      where: { userId },
      _sum: { amount: true },
    });
  }
}
