import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';
import { AppModule } from './../src/app.module';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
const TEST_USER_ID = process.env.TESTING_USER_ID!;
const prisma = new PrismaClient();

async function createJwt(): Promise<string> {
  const session = await clerk.sessions.createSession({ userId: TEST_USER_ID });
  const { jwt } = await clerk.sessions.getToken(session.id);
  return `Bearer ${jwt}`;
}

describe('Transactions E2E — TC001–TC010', () => {
  let app: INestApplication;
  let authHeader: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    authHeader = await createJwt();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.transaction.deleteMany();
  });

  // TC001

  /* Expected Results:
  1. Response status is 201 Created.
  2. Response body contains the created transaction with all fields matching the request.
  3. Transaction is stored in the database linked to the authenticated user's userId. */

  it('TC001: Create Transaction with Valid Data', async () => {
    const dto = {
      amount: 123.45,
      type: 'send',
      category: 'groceries',
      recipient: 'alice',
    };
    const res = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', authHeader)
      .send(dto)
      //1. Response status is 201 Created.
      .expect(201);

    //2. Response body contains the created transaction with all fields matching the request.
    expect(res.body).toMatchObject({
      amount: dto.amount,
      type: dto.type,
      category: dto.category,
      recipient: dto.recipient,
      userId: TEST_USER_ID,
    });
    expect(typeof res.body.id).toBe('number');

    const created = await prisma.transaction.findUnique({
      where: { id: res.body.id },
    });
    //3. Transaction is stored in the database linked to the authenticated user's userId.
    expect(created).not.toBeNull();
    expect(created?.userId).toBe(TEST_USER_ID);
  });

  // TC002

  /* Expected Results:
  1. Response status is 400 Bad Request.
  2. Response body contains an error message indicating which required fields are missing.
  3. No transaction is created in the database. */

  it('TC002: Create Transaction with Missing Required Fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', authHeader)
      .send({})
      //1. Response status is 400 Bad Request.
      .expect(400);

    //2. Response body contains an error message indicating which required fields are missing.
    expect(res.body.message).toEqual(
      expect.arrayContaining([
        'Amount must be a positive number.',
        'Type must be either send or receive.',
        'Category must be between 2 and 50 characters.',
        'Category must not be empty.',
        'Category must be a string.',
        'Recipient must be between 2 and 100 characters.',
        'Recipient must not be empty.',
        'Recipient must be a string.',
      ]),
    );
    expect(res.body.message).toHaveLength(8);
    //3. No transaction is created in the database.
    const count = await prisma.transaction.count({
      where: { userId: TEST_USER_ID },
    });
    expect(count).toBe(0);
  });

  // TC003

  /* Expected Results:
  1. Response status is 400 Bad Request.
  2. Response body contains an error message indicating invalid 'type' value.
  3. No transaction is created in the database. */

  it('TC003: Create Transaction with Invalid Type Field', async () => {
    const dto = {
      amount: 50,
      type: 'transfer',
      category: 'rent',
      recipient: 'landlord',
    };
    const res = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', authHeader)
      .send(dto)
      //1. Response status is 400 Bad Request.
      .expect(400);

    //2. Response body contains an error message indicating invalid 'type' value.
    expect(res.body.message).toContain('Type must be either send or receive.');

    const count = await prisma.transaction.count({
      where: { userId: TEST_USER_ID },
    });

    //3. No transaction is created in the database.
    expect(count).toBe(0);
  });

  // TC004
  /* Expected Results:
  1. Response status is 401 Unauthorized.
  2. Response body contains an error message indicating authentication is required.
  3. No transaction is created in the database. */

  it('TC004: Create Transaction Without Authentication', async () => {
    const dto = {
      amount: 30,
      type: 'send',
      category: 'coffee',
      recipient: 'barista',
    };
    const res = await request(app.getHttpServer())
      .post('/transactions')
      .send(dto)
      //1. Response status is 401 Unauthorized.
      .expect(401);

    //2. Response body contains an error message indicating authentication is required.
    expect(res.body.message).toContain('No token provided');

    const count = await prisma.transaction.count();

    //3. No transaction is created in the database.
    expect(count).toBe(0);
  });

  // TC005
  /* Expected Results:
  1. Response status is 200 OK.
  2. Response body contains an array of transactions belonging only to the authenticated user.
  3. Each transaction contains all required fields (id, userId, amount, type, category, recipient, createdAt). */

  it('TC005: List All Transactions for Authenticated User', async () => {
    await prisma.transaction.createMany({
      data: [
        {
          userId: TEST_USER_ID,
          amount: 10,
          type: 'send',
          category: 'a',
          recipient: 'x',
        },
        {
          userId: TEST_USER_ID,
          amount: 20,
          type: 'receive',
          category: 'b',
          recipient: 'y',
        },
        {
          userId: 'other-user',
          amount: 30,
          type: 'send',
          category: 'c',
          recipient: 'z',
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', authHeader)
      //1. Response status is 200 OK.
      .expect(200);

    //2. Response body contains an array of transactions belonging only to the authenticated user.
    //3. Each transaction contains all required fields (id, userId, amount, type, category, recipient, createdAt).
    expect(res.body).toHaveLength(2);
    for (const tx of res.body) {
      expect(tx.userId).toBe(TEST_USER_ID);
      expect(tx).toHaveProperty('id');
      expect(tx).toHaveProperty('amount');
      expect(tx).toHaveProperty('type');
      expect(tx).toHaveProperty('category');
      expect(tx).toHaveProperty('recipient');
      expect(tx).toHaveProperty('createdAt');
    }
  });

  // TC006
  /* Expected Results:
  1. Response status is 200 OK.
  2. Response body contains only transactions where type is 'send' and category is 'groceries' belonging to the authenticated user.
  3. No transactions outside the filter criteria are included. */

  it('TC006: List Transactions Filtered by Type and Category', async () => {
    await prisma.transaction.createMany({
      data: [
        {
          userId: TEST_USER_ID,
          amount: 5,
          type: 'send',
          category: 'groceries',
          recipient: 'a',
        },
        {
          userId: TEST_USER_ID,
          amount: 7,
          type: 'send',
          category: 'other',
          recipient: 'b',
        },
        {
          userId: TEST_USER_ID,
          amount: 9,
          type: 'receive',
          category: 'groceries',
          recipient: 'c',
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', authHeader)
      .query({ type: 'send', category: 'groceries' })
      //1. Response status is 200 OK.
      .expect(200);

    //2. Response body contains only transactions where type is 'send' and category is 'groceries' belonging to the authenticated user.
    //3. No transactions outside the filter criteria are included.
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('send');
    expect(res.body[0].category).toBe('groceries');
  });

  // TC007
  /* Expected Results:
  1. Response status is 400 Bad Request.
  2. Response body contains an error message indicating the error. */

  it('TC007: List Transactions with Invalid type Filter Parameters', async () => {
    const res = await request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', authHeader)
      .query({ type: 'invalidType' })
      //1. Response status is 400 Bad Request.
      .expect(400);

    //2. Response body contains an error message indicating the error.
    expect(res.body.message).toContain('Type filter must be send or receive.');
  });

  // TC008
  /* Expected Results:
  1. Response status is 401 Unauthorized.
  2. Response body contains an error message indicating authentication is required. */

  it('TC008: List Transactions Without Authentication', async () => {
    const res = await request(app.getHttpServer())
      .get('/transactions')
      //1. Response status is 401 Unauthorized.
      .expect(401);

    //2. Response body contains an error message indicating authentication is required.
    expect(res.body.message).toContain('No token provided');
  });

  // TC009
  /* Expected Results:
  1. Response status is 200 OK.
  2. Response body contains a summary object with total amounts sent and received grouped by category.
  3. Totals accurately reflect the sum of amounts from the user's transactions. */

  it('TC009: Get Transactions Summary for Authenticated User', async () => {
    await prisma.transaction.createMany({
      data: [
        {
          userId: TEST_USER_ID,
          amount: 100,
          type: 'send',
          category: 'expenses',
          recipient: 'mom',
        },
        {
          userId: TEST_USER_ID,
          amount: 200,
          type: 'receive',
          category: 'expenses',
          recipient: 'brother',
        },
        {
          userId: TEST_USER_ID,
          amount: 50,
          type: 'send',
          category: 'gift',
          recipient: 'z',
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/transactions/summary')
      .set('Authorization', authHeader)
      //1. Response status is 200 OK.
      .expect(200);

    //2. Response body contains a summary object with total amounts sent and received grouped by category.
    expect(res.body).toEqual(
      expect.arrayContaining([
        //3. Totals accurately reflect the sum of amounts from the user's transactions.
        { category: 'expenses', sent: 100, received: 200 },
        { category: 'gift', sent: 50, received: 0 },
      ]),
    );
  });

  // TC010
  /* Expected Results:
  1. Response status is 401 Unauthorized.
  2. Response body contains an error message indicating authentication is required. */

  it('TC010: Get Transactions Summary Without Authentication', async () => {
    const res = await request(app.getHttpServer())
      .get('/transactions/summary')
      //1. Response status is 401 Unauthorized.
      .expect(401);

    //2. Response body contains an error message indicating authentication is required.
    expect(res.body.message).toContain('No token provided');
  });
});
