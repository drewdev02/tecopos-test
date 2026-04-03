import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { WebhookEvent } from '../webhook.entity.js';

export class CreateWebhookDto {
  @ApiProperty({ format: 'uri', example: 'https://example.com/webhooks/bank' })
  @IsUrl({ require_tld: true, require_protocol: true })
  public url!: string;

  @ApiProperty({ enum: WebhookEvent, enumName: 'WebhookEvent' })
  @IsEnum(WebhookEvent)
  public event!: WebhookEvent;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}
