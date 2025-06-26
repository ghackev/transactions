import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: { ...dto, userId },
    });
  }

  findAll(userId: string, type?: TransactionType, category?: string) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        ...(type && { type }),
        ...(category && { category }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async summary(userId: string) {
    const rows = await this.prisma.transaction.groupBy({
      by: ['category', 'type'],
      _sum: { amount: true },
      where: { userId },
    });

    const map: Record<
      string,
      { category: string; sent: number; received: number }
    > = {};

    rows.forEach((r) => {
      const cat = r.category;
      map[cat] ??= { category: cat, sent: 0, received: 0 };
      if (r.type === 'send') map[cat].sent += Number(r._sum.amount);
      else map[cat].received += Number(r._sum.amount);
    });

    return Object.values(map); // ← ej. [{ category:'e2e', sent:290, received:50 }, …]
  }
}
