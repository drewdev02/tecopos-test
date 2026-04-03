import { HttpException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { WebhooksService } from './webhooks.service.js';
import { WebhookEntity, WebhookEvent } from './webhook.entity.js';
import type { CreateWebhookDto } from './dto/create-webhook.dto.js';

type WebhooksRepositoryMock = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  delete: jest.Mock;
};

describe('WebhooksService', () => {
  let service: WebhooksService;
  let repository: WebhooksRepositoryMock;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: getRepositoryToken(WebhookEntity),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('create stores user-scoped webhook', async () => {
    // AI-assisted test case
    const userId = 'user-1';
    const dto: CreateWebhookDto = {
      url: 'https://example.com/webhooks',
      event: WebhookEvent.TRANSACTION_CREATED,
      isActive: false,
    };

    const created = {
      userId,
      url: dto.url,
      event: dto.event,
      isActive: false,
    } as WebhookEntity;

    const saved = {
      ...created,
      id: 'wh-1',
      createdAt: new Date('2026-04-03T00:00:00.000Z'),
      updatedAt: new Date('2026-04-03T00:00:00.000Z'),
    } as WebhookEntity;

    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(saved);

    const result = await service.create(userId, dto);

    expect(repository.create).toHaveBeenCalledWith({
      userId,
      url: dto.url,
      event: dto.event,
      isActive: false,
    });
    expect(repository.save).toHaveBeenCalledWith(created);
    expect(result).toBe(saved);
  });

  it('list returns only user-scoped data', async () => {
    // AI-assisted test case
    const userId = 'user-1';
    const rows = [
      {
        id: 'wh-2',
        userId,
      },
      {
        id: 'wh-1',
        userId,
      },
    ] as WebhookEntity[];

    repository.find.mockResolvedValue(rows);

    const result = await service.list(userId);

    expect(repository.find).toHaveBeenCalledWith({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    expect(result).toEqual({ items: rows });
  });

  it('delete removes only user-owned row', async () => {
    // AI-assisted test case
    repository.delete.mockResolvedValue({ affected: 1 } as Awaited<ReturnType<Repository<WebhookEntity>['delete']>>);

    await expect(service.delete('user-1', 'wh-1')).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith({ id: 'wh-1', userId: 'user-1' });
  });

  it('delete throws when not found', async () => {
    // AI-assisted test case
    repository.delete.mockResolvedValue({ affected: 0 } as Awaited<ReturnType<Repository<WebhookEntity>['delete']>>);

    const deletion = service.delete('user-1', 'missing');

    await expect(deletion).rejects.toBeInstanceOf(HttpException);
    await expect(deletion).rejects.toMatchObject({
      response: {
        code: 'WEBHOOK_NOT_FOUND',
        message: 'Webhook not found',
      },
      status: 404,
    });
  });
});
