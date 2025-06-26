import { Controller, Get, Post, Query, Body, UseGuards, Req } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Request } from 'express';

@Controller('transactions')
@UseGuards(ClerkAuthGuard)
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateTransactionDto) {
    const userId = (req.user as any).id as string;
    return this.service.create(userId, dto);
  }

  @Get()
  findAll(
    @Req() req: Request,
    @Query('type') type?: string,
    @Query('category') category?: string,
  ) {
    const userId = (req.user as any).id as string;
    return this.service.findAll(userId, type as any, category);
  }

  @Get('summary')
  summary(@Req() req: Request) {
    const userId = (req.user as any).id as string;
    return this.service.summary(userId);
  }
}
