import { CanActivate, ExecutionContext, Injectable, createParamDecorator } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import clerk from '@clerk/clerk-sdk-node';

export const ClerkUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.userId as string;
});

@Injectable()
export class ClerkGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      throw new HttpException('Missing auth header', HttpStatus.UNAUTHORIZED);
    }
    const token = authHeader.replace('Bearer ', '').trim();
    try {
      const payload = await clerk.verifyToken(token);
      request.userId = payload.sub as string;
      return true;
    } catch (err) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
  }
}
