import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async health() {
    // ping a la base de datos
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}