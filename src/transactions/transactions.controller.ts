import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transaction } from '@prisma/client';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  create(@Body() data: Omit<Transaction, 'id' | 'createdAt'>) {
    return this.service.create(data);
  }

  @Get()
  list(@Query('type') type?: string, @Query('category') category?: string) {
    return this.service.list({ type, category });
  }

  @Get('summary')
  summary() {
    return this.service.summary();
  }
}
