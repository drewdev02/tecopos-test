import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { WebhookEvent } from '../webhook.entity.js';

export class CreateWebhookDto {
  @ApiProperty({ example: 'webhook-endpoint-1' })
  @IsString()
  @MinLength(1)
  public url!: string;

  @ApiProperty({ enum: WebhookEvent, enumName: 'WebhookEvent' })
  @IsEnum(WebhookEvent)
  public event!: WebhookEvent;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}
