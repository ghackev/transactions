import { Body, Controller, Post } from '@nestjs/common';
import clerk from '@clerk/clerk-sdk-node';

interface SignupDto {
  email: string;
  password: string;
}

interface LoginDto {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    const user = await clerk.users.createUser({
      emailAddress: [dto.email],
      password: dto.password,
    });
    const token = await clerk.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60 * 60,
    });
    return { userId: user.id, token: token.token };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const users = await clerk.users.getUserList({ emailAddress: [dto.email], limit: 1 });
    if (!users.length) {
      throw new Error('Invalid credentials');
    }
    const user = users[0];
    await clerk.users.verifyPassword({ userId: user.id, password: dto.password });
    const token = await clerk.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60 * 60,
    });
    return { userId: user.id, token: token.token };
  }
}
