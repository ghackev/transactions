import {
  IsPositive,
  IsEnum,
  IsString,
  IsNotEmpty,
  Length,
} from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsPositive({ message: 'Amount must be a positive number.' })
  amount: number;

  @IsEnum(TransactionType, { message: 'Type must be either send or receive.' })
  type: TransactionType;

  @IsString({ message: 'Category must be a string.' })
  @IsNotEmpty({ message: 'Category must not be empty.' })
  @Length(2, 50, { message: 'Category must be between 2 and 50 characters.' })
  category: string;

  @IsString({ message: 'Recipient must be a string.' })
  @IsNotEmpty({ message: 'Recipient must not be empty.' })
  @Length(2, 100, {
    message: 'Recipient must be between 2 and 100 characters.',
  })
  recipient: string;
}
