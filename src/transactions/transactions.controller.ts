import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { ClerkGuard, ClerkUser } from '../auth/clerk.guard';
import { CreateTransactionDto } from './transactions.dto';

@Controller('transactions')
@UseGuards(ClerkGuard)
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  async create(@ClerkUser() userId: string, @Body() dto: CreateTransactionDto) {
    return this.service.create({ ...dto, userId });
  }

  @Get()
  async findAll(
    @ClerkUser() userId: string,
    @Query('type') type?: 'send' | 'receive',
    @Query('category') category?: string,
  ) {
    return this.service.findAll(userId, { type, category });
  }

  @Get('summary')
  async summary(@ClerkUser() userId: string) {
    return this.service.summary(userId);
  }
}
