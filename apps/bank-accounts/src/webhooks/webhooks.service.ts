import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateWebhookDto } from './dto/create-webhook.dto.js';
import { WebhookEntity } from './webhook.entity.js';

@Injectable()
export class WebhooksService {
  public constructor(
    @InjectRepository(WebhookEntity)
    private readonly webhooksRepository: Repository<WebhookEntity>,
  ) {}

  public async create(userId: string, dto: CreateWebhookDto): Promise<WebhookEntity> {
    const webhook = this.webhooksRepository.create({
      userId,
      url: dto.url,
      event: dto.event,
      isActive: dto.isActive ?? true,
    });

    return this.webhooksRepository.save(webhook);
  }

  public async list(userId: string): Promise<{ items: WebhookEntity[] }> {
    const items = await this.webhooksRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return { items };
  }

  public async delete(userId: string, webhookId: string): Promise<void> {
    const result = await this.webhooksRepository.delete({
      id: webhookId,
      userId,
    });

    if (!result.affected) {
      throw new HttpException(
        {
          code: 'WEBHOOK_NOT_FOUND',
          message: 'Webhook not found',
        },
        404,
      );
    }
  }
}
