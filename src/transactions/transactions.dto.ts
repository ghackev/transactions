import { IsNumber, IsEnum, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  amount!: number;

  @IsEnum(['send', 'receive'])
  type!: 'send' | 'receive';

  @IsString()
  category!: string;

  @IsString()
  recipient!: string;
}
