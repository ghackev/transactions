import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  Length,
} from 'class-validator';
import { TransactionType } from '@prisma/client';

export class TransactionsQueryDto {
  @IsOptional()
  @IsEnum(TransactionType, { message: 'Type filter must be send or receive.' })
  type?: TransactionType;

  @IsOptional()
  @IsString({ message: 'Category filter must be a string.' })
  @IsNotEmpty({ message: 'Category filter must not be empty if provided.' })
  @Length(2, 50, {
    message: 'Category filter must be between 2 and 50 characters.',
  })
  category?: string;
}
