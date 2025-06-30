import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Request } from 'express';
import { TransactionsQueryDto } from './dto/transactions-query.dto';

export interface AuthRequest extends Request {
  user: { id: string };
}

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
  findAll(@Req() req: AuthRequest, @Query() query: TransactionsQueryDto) {
    return this.service.findAll(req.user.id, query.type, query.category);
  }

  @Get('summary')
  summary(@Req() req: Request) {
    const userId = (req.user as any).id as string;
    return this.service.summary(userId);
  }
}
