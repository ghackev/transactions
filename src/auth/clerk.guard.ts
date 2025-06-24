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
    const auth = request.auth;
    if (!auth || !auth.userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    request.userId = auth.userId as string;
    return true;
  }
}
