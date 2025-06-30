import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TransactionsService (unit)', () => {
  let service: TransactionsService;

  const mockPrisma = {
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call prisma.create with correct data', async () => {
      const dto = {
        amount: 100,
        type: 'send' as const,
        category: 'test',
        recipient: 'someone',
      };
      const userId = 'user-123';

      mockPrisma.transaction.create.mockResolvedValue({
        id: 1,
        ...dto,
        userId,
      });

      const result = await service.create(userId, dto);

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          userId,
        },
      });

      expect(result).toEqual({ id: 1, ...dto, userId });
    });
  });

  describe('findAll', () => {
    it('should call findMany with no filters if none provided', async () => {
      const userId = 'user-123';
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.findAll(userId);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should call findMany with type filter', async () => {
      const userId = 'user-123';
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.findAll(userId, 'send');

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId, type: 'send' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should call findMany with type and category filters', async () => {
      const userId = 'user-123';
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.findAll(userId, 'receive', 'salary');

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId, type: 'receive', category: 'salary' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('summary', () => {
    it('should call groupBy with correct args and transform result', async () => {
      const userId = 'user-123';

      const mockRawGroup = [
        { category: 'groceries', type: 'send', _sum: { amount: 200 } },
        { category: 'salary', type: 'receive', _sum: { amount: 500 } },
      ];
      mockPrisma.transaction.groupBy.mockResolvedValue(mockRawGroup);

      const result = await service.summary(userId);

      expect(mockPrisma.transaction.groupBy).toHaveBeenCalledWith({
        by: ['category', 'type'],
        where: { userId },
        _sum: { amount: true },
      });

      expect(result).toEqual([
        { category: 'groceries', sent: 200, received: 0 },
        { category: 'salary', sent: 0, received: 500 },
      ]);
    });
  });
});
