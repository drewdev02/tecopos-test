import { ApiProperty } from '@nestjs/swagger';
import { WebhookEvent } from '../webhook.entity.js';

export class WebhookResponseDto {
  @ApiProperty({ format: 'uuid' })
  public id!: string;

  @ApiProperty()
  public userId!: string;

  @ApiProperty({ format: 'uri' })
  public url!: string;

  @ApiProperty({ enum: WebhookEvent, enumName: 'WebhookEvent' })
  public event!: WebhookEvent;

  @ApiProperty({ default: true })
  public isActive!: boolean;

  @ApiProperty()
  public createdAt!: Date;

  @ApiProperty()
  public updatedAt!: Date;
}

export class WebhookListResponseDto {
  @ApiProperty({ type: () => [WebhookResponseDto] })
  public items!: WebhookResponseDto[];
}
