import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
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
    const sent = await this.prisma.transaction.groupBy({
      by: ['category'],
      where: { userId, type: 'send' },
      _sum: { amount: true },
    });
    const received = await this.prisma.transaction.groupBy({
      by: ['category'],
      where: { userId, type: 'receive' },
      _sum: { amount: true },
    });
    return { sent, received };
  }
}
