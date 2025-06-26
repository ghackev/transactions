import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { signJwt } from '@clerk/backend/jwt';

describe('Transactions Endpoints (e2e)', () => {
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

  let createdId: number;

  it('/transactions (POST)', async () => {
    const dto = {
      amount: 100,
      type: 'send',
      category: 'e2e',
      recipient: 'test-user',
    };

    const { body } = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', authHeader)
      .send(dto)
      .expect(201);

    createdId = body.id;
    expect(body).toMatchObject({ ...dto, userId: process.env.TESTING_USER_ID });
  });

  it('/transactions (GET)', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', authHeader)
      .expect(200);

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('/transactions filtered by type', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/transactions')
      .query({ type: 'send' })
      .set('Authorization', authHeader)
      .expect(200);

    expect(Array.isArray(body)).toBe(true);
    body.forEach((tx: any) => expect(tx.type).toBe('send'));
  });

  it('/transactions filtered by category', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/transactions')
      .query({ category: 'e2e' })
      .set('Authorization', authHeader)
      .expect(200);

    expect(Array.isArray(body)).toBe(true);
    body.forEach((tx: any) => expect(tx.category).toBe('e2e'));
  });

  it('/transactions/summary (GET)', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/transactions/summary')
      .set('Authorization', authHeader)
      .expect(200);

    expect(body).toHaveProperty('sent');
    expect(body).toHaveProperty('received');
  });
});
