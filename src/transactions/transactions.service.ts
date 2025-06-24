import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient, Transaction } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(@Inject('PRISMA') private prisma: PrismaClient) {}

  create(data: Omit<Transaction, 'id' | 'createdAt'>) {
    return this.prisma.transaction.create({ data });
  }

  list(filter: { type?: string; category?: string }) {
    const where: any = { userId: (this.prisma as any).userId };
    if (filter.type) where.type = filter.type;
    if (filter.category) where.category = filter.category;
    return this.prisma.transaction.findMany({ where });
  }

  async summary() {
    const userId = (this.prisma as any).userId;
    const transactions = await this.prisma.transaction.findMany({ where: { userId } });
    return transactions.reduce((acc, t) => {
      const key = t.category;
      if (!acc[key]) acc[key] = { send: 0, receive: 0 };
      acc[key][t.type] += t.amount;
      return acc;
    }, {} as Record<string, { send: number; receive: number }>);
  }
}
