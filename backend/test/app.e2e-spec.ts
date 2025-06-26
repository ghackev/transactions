import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { signJwt } from '@clerk/backend/jwt';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let authHeader: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const token = await signJwt(
      { sub: process.env.TESTING_USER_ID },
      process.env.CLERK_SECRET_KEY,
      { algorithm: 'HS256' },
    );
    authHeader = `Bearer ${token}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .set('Authorization', authHeader)
      .expect(200)
      .expect('Hello World!');
  });
});
