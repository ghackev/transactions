import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private prisma = new PrismaClient();

  async use(req: Request, res: Response, next: NextFunction) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ message: 'Unauthorized' });
    // Expect header: Bearer <userId>
    const token = header.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    (this.prisma as any).userId = token; // attach to prisma for demo
    next();
  }
}
