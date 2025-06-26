import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { createClerkClient } from '@clerk/backend';
import { PrismaClient } from '@prisma/client';

/**
 * Comprehensive end‑to‑end test suite for the Transactions API.
 *
 * The suite covers:
 *   • Authentication failures (missing / invalid JWT)
 *   • DTO validation errors (missing fields, negative amount, invalid enum values)
 *   • Successful CRUD‑like operations for different scenarios
 *   • Filtering combinations (type, category, combined)
 *   • Aggregation accuracy (/summary endpoint)
 *
 * Environment variables required:
 *   – CLERK_SECRET_KEY   → Backend secret for generating testing JWTs
 *   – TESTING_USER_ID    → Existing Clerk user ID to impersonate in tests
 */

describe('Transactions Endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let authHeader: string;
  const prisma = new PrismaClient();

  /* ------------------------------------------------------------------------- */
  /*  Test helpers                                                             */
  /* ------------------------------------------------------------------------- */

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  /** Create a short‑lived JWT for the testing user */
  const createJwt = async (): Promise<string> => {
    const session = await clerk.sessions.createSession({
      userId: process.env.TESTING_USER_ID!,
    });

    const { jwt } = await clerk.sessions.getToken(session.id);
    return `Bearer ${jwt}`;
  };

  /** Factory to produce a valid DTO with optional overrides */
  const validTx = (
    overrides: Partial<{
      amount: number;
      type: 'send' | 'receive';
      category: string;
      recipient: string;
    }> = {},
  ) => ({
    amount: 100,
    type: 'send' as const,
    category: 'e2e',
    recipient: 'test-recipient',
    ...overrides,
  });

  const created: Array<ReturnType<typeof validTx> & { id: number }> = [];

  /* ------------------------------------------------------------------------- */
  /*  Lifecycle                                                                */
  /* ------------------------------------------------------------------------- */

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Ensure ValidationPipe matches production settings
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    authHeader = await createJwt();

      await prisma.transaction.deleteMany({
        where: { userId: process.env.TESTING_USER_ID },
      });
  });

  afterAll(async () => {
    await app.close();
  });

  /* ------------------------------------------------------------------------- */
  /*  AUTH                                                                     */
  /* ------------------------------------------------------------------------- */

  it('should reject requests without Authorization header', () =>
    request(app.getHttpServer()).get('/transactions').expect(401));

  it('should reject requests with an invalid token', () =>
    request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .expect(401));

  /* ------------------------------------------------------------------------- */
  /*  POST /transactions                                                       */
  /* ------------------------------------------------------------------------- */

  it('should validate DTO – missing required fields', () =>
    request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', authHeader)
      .send({ amount: 50 }) // missing type, category, recipient
      .expect(400));

  it('should validate DTO – negative amount', () =>
    request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', authHeader)
      .send(validTx({ amount: -10 }))
      .expect(400));

  it('should validate DTO – invalid type value', () =>
    request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', authHeader)
      .send(validTx({ type: 'invalid' as any }))
      .expect(400));

  it('should create a SEND transaction', async () => {
    const dto = validTx();
    const { body } = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', authHeader)
      .send(dto)
      .expect(201);

    created.push(body);
    expect(body).toMatchObject({ ...dto, userId: process.env.TESTING_USER_ID });
  });

  it('should create a RECEIVE transaction', async () => {
    const dto = validTx({ amount: 50, type: 'receive', category: 'salary' });
    const { body } = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', authHeader)
      .send(dto)
      .expect(201);

    created.push(body);
    expect(body).toMatchObject({ ...dto, userId: process.env.TESTING_USER_ID });
  });

  it('should create another SEND transaction (different category)', async () => {
    const dto = validTx({ amount: 200, category: 'groceries' });
    const { body } = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', authHeader)
      .send(dto)
      .expect(201);

    created.push(body);
    expect(body).toMatchObject({ ...dto, userId: process.env.TESTING_USER_ID });
  });

  /* ------------------------------------------------------------------------- */
  /*  GET /transactions                                                        */
  /* ------------------------------------------------------------------------- */

  it('should list all transactions', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', authHeader)
      .expect(200);

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(created.length);
    created.forEach((tx) =>
      expect(body).toEqual(expect.arrayContaining([expect.objectContaining({ id: tx.id })])),
    );
  });

  it('should filter by type', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/transactions')
      .query({ type: 'send' })
      .set('Authorization', authHeader)
      .expect(200);

    expect(body.every((tx: any) => tx.type === 'send')).toBe(true);
  });

  it('should filter by category', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/transactions')
      .query({ category: 'groceries' })
      .set('Authorization', authHeader)
      .expect(200);

    expect(body.every((tx: any) => tx.category === 'groceries')).toBe(true);
  });

  it('should filter by type AND category', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/transactions')
      .query({ type: 'send', category: 'e2e' })
      .set('Authorization', authHeader)
      .expect(200);

    expect(body.every((tx: any) => tx.type === 'send' && tx.category === 'e2e')).toBe(true);
  });

  it('should return empty array for non‑existent category', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/transactions')
      .query({ category: 'does-not-exist' })
      .set('Authorization', authHeader)
      .expect(200);

    expect(body).toEqual([]);
  });

  /* ------------------------------------------------------------------------- */
  /*  GET /transactions/summary                                                */
  /* ------------------------------------------------------------------------- */

      it('should return total sent/received grouped by category', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/transactions/summary')
      .set('Authorization', authHeader)
      .expect(200);

    // Build expected structure from the transactions we created in this test run
    const expectedByCategory: Record<string, { sent: number; received: number }> = {};
    created.forEach((tx) => {
      expectedByCategory[tx.category] ??= { sent: 0, received: 0 };
      if (tx.type === 'send') expectedByCategory[tx.category].sent += Number(tx.amount);
      else expectedByCategory[tx.category].received += Number(tx.amount);
    });

    // body must be an array of { category, sent, received }
    expect(Array.isArray(body)).toBe(true);
    Object.entries(expectedByCategory).forEach(([category, totals]) => {
      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ category, ...totals }),
        ]),
      );
    });
  });
});
