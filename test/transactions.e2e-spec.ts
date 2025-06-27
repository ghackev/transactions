import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';

describe('Transactions E2E (independent)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let authHeader: string;
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const testUserId = process.env.TESTING_USER_ID!;

  const createJwt = async (): Promise<string> => {
    const session = await clerk.sessions.createSession({ userId: testUserId });
    const { jwt } = await clerk.sessions.getToken(session.id);
    return `Bearer ${jwt}`;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = new PrismaClient();
    authHeader = await createJwt();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  /* ------------------------------------------------------------------------- */
  /*  AUTH                                                                     */
  /* ------------------------------------------------------------------------- */

  describe('AUTH', () => {
    it('should reject requests without Authorization header', () =>
      request(app.getHttpServer()).get('/transactions').expect(401));

    it('should reject requests with an invalid token', () =>
      request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401));
  });

  /* ------------------------------------------------------------------------- */
  /*  POST /transactions                                                       */
  /* ------------------------------------------------------------------------- */

  describe('POST /transactions', () => {
    beforeEach(async () => {
      await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    });

    it('should reject missing required fields', () =>
      request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', authHeader)
        .send({ amount: 50 }) // Falta type, category, recipient
        .expect(400));

    it('should reject negative amount', () =>
      request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', authHeader)
        .send({
          amount: -20,
          type: 'send',
          category: 'test',
          recipient: 'x',
        })
        .expect(400));

    it('should reject invalid type', () =>
      request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', authHeader)
        .send({
          amount: 50,
          type: 'invalid',
          category: 'test',
          recipient: 'x',
        })
        .expect(400));

    it('should create a SEND transaction and persist in DB', async () => {
      const dto = {
        amount: 150,
        type: 'send',
        category: 'test-category',
        recipient: 'user1',
      };

      const { body } = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', authHeader)
        .send(dto)
        .expect(201);

      expect(body).toMatchObject({
        ...dto,
        userId: testUserId,
      });

      expect(body.id).toBeDefined();

      const txInDb = await prisma.transaction.findUnique({
        where: { id: body.id },
      });

      expect(txInDb).toBeTruthy();
      expect(txInDb).toMatchObject({
        ...dto,
        userId: testUserId,
      });

      expect(txInDb?.createdAt).toBeInstanceOf(Date);
      expect(txInDb?.amount).toBe(150);
    });

    it('should create a RECEIVE transaction and persist in DB', async () => {
      const dto = {
        amount: 200,
        type: 'receive',
        category: 'salary',
        recipient: 'company-x',
      };

      const { body } = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', authHeader)
        .send(dto)
        .expect(201);

      expect(body).toMatchObject({
        ...dto,
        userId: testUserId,
      });

      const txInDb = await prisma.transaction.findUnique({
        where: { id: body.id },
      });

      expect(txInDb).toBeTruthy();
      expect(txInDb).toMatchObject({
        ...dto,
        userId: testUserId,
      });
    });
  });

  /* ------------------------------------------------------------------------- */
  /*  GET /transactions                                                        */
  /* ------------------------------------------------------------------------- */

  describe('GET /transactions', () => {
    beforeEach(async () => {
      await prisma.transaction.deleteMany({ where: { userId: testUserId } });
      await prisma.transaction.createMany({
        data: [
          {
            amount: 100,
            type: 'send',
            category: 'groceries',
            recipient: 'x',
            userId: testUserId,
          },
          {
            amount: 200,
            type: 'receive',
            category: 'salary',
            recipient: 'y',
            userId: testUserId,
          },
          {
            amount: 150,
            type: 'send',
            category: 'groceries',
            recipient: 'z',
            userId: testUserId,
          },
        ],
      });
    });

    it('should list all transactions', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', authHeader)
        .expect(200);

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(3);
    });

    it('should filter by type', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/transactions')
        .query({ type: 'send' })
        .set('Authorization', authHeader)
        .expect(200);

      expect(body.every((tx: any) => tx.type === 'send')).toBe(true);
      expect(body.length).toBe(2);
    });

    it('should filter by category', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/transactions')
        .query({ category: 'salary' })
        .set('Authorization', authHeader)
        .expect(200);

      expect(body.every((tx: any) => tx.category === 'salary')).toBe(true);
      expect(body.length).toBe(1);
    });

    it('should filter by type AND category', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/transactions')
        .query({ type: 'send', category: 'groceries' })
        .set('Authorization', authHeader)
        .expect(200);

      expect(
        body.every(
          (tx: any) => tx.type === 'send' && tx.category === 'groceries',
        ),
      ).toBe(true);
      expect(body.length).toBe(2);
    });

    it('should return empty array for unknown category', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/transactions')
        .query({ category: 'nonexistent' })
        .set('Authorization', authHeader)
        .expect(200);

      expect(body).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------------- */
  /*  GET /transactions/summary                                                */
  /* ------------------------------------------------------------------------- */

  describe('GET /transactions/summary', () => {
    beforeEach(async () => {
      await prisma.transaction.deleteMany({ where: { userId: testUserId } });

      // Creamos una mezcla de categorías y tipos
      await prisma.transaction.createMany({
        data: [
          {
            amount: 100,
            type: 'send',
            category: 'groceries',
            recipient: 'x',
            userId: testUserId,
          },
          {
            amount: 300,
            type: 'receive',
            category: 'salary',
            recipient: 'y',
            userId: testUserId,
          },
          {
            amount: 200,
            type: 'send',
            category: 'groceries',
            recipient: 'z',
            userId: testUserId,
          },
          {
            amount: 500,
            type: 'send',
            category: 'rent',
            recipient: 'landlord',
            userId: testUserId,
          },
          {
            amount: 400,
            type: 'receive',
            category: 'freelance',
            recipient: 'client',
            userId: testUserId,
          },
          {
            amount: 50,
            type: 'send',
            category: 'subscriptions',
            recipient: 'spotify',
            userId: testUserId,
          },
        ],
      });
    });

    it('should return correct grouped totals for multiple categories', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/transactions/summary')
        .set('Authorization', authHeader)
        .expect(200);

      expect(Array.isArray(body)).toBe(true);

      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'groceries',
            sent: 300, // 100 + 200 send
            received: 0,
          }),
          expect.objectContaining({
            category: 'salary',
            sent: 0,
            received: 300,
          }),
          expect.objectContaining({
            category: 'rent',
            sent: 500,
            received: 0,
          }),
          expect.objectContaining({
            category: 'freelance',
            sent: 0,
            received: 400,
          }),
          expect.objectContaining({
            category: 'subscriptions',
            sent: 50,
            received: 0,
          }),
        ]),
      );
    });

    it('should not return unrelated categories', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/transactions/summary')
        .set('Authorization', authHeader)
        .expect(200);

      // Asegura que NO haya categorías que no insertamos
      const categoriesReturned = body.map((row: any) => row.category);
      expect(categoriesReturned).toEqual(
        expect.arrayContaining([
          'groceries',
          'salary',
          'rent',
          'freelance',
          'subscriptions',
        ]),
      );
    });

    it('should sum correctly when category has mixed send/receive', async () => {
      // Hagamos una receive en groceries.
      await prisma.transaction.create({
        data: {
          amount: 50,
          type: 'receive',
          category: 'groceries',
          recipient: 'refund',
          userId: testUserId,
        },
      });

      const { body } = await request(app.getHttpServer())
        .get('/transactions/summary')
        .set('Authorization', authHeader)
        .expect(200);

      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'groceries',
            sent: 300,
            received: 50,
          }),
        ]),
      );
    });

    it('should return empty array if no transactions exist', async () => {
      await prisma.transaction.deleteMany({ where: { userId: testUserId } });

      const { body } = await request(app.getHttpServer())
        .get('/transactions/summary')
        .set('Authorization', authHeader)
        .expect(200);

      expect(body).toEqual([]);
    });
  });
});
