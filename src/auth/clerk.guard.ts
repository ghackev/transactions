import { CanActivate, ExecutionContext, Injectable, createParamDecorator } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';

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
    const token = authHeader.replace('Bearer ', '');
    // Placeholder for Clerk verification; assume token is the userId
    if (!token) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
    request.userId = token;
    return true;
  }
}
