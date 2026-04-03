import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WebhookEvent {
  TRANSACTION_CREATED = 'transaction.created',
  BALANCE_UPDATED = 'balance.updated',
}

@Entity({ name: 'webhooks' })
@Index('IDX_WEBHOOKS_USER_ID', ['userId'])
export class WebhookEntity {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column({ type: 'varchar', length: 255 })
  public userId!: string;

  @Column({ type: 'varchar', length: 1024 })
  public url!: string;

  @Column({ type: 'enum', enum: WebhookEvent })
  public event!: WebhookEvent;

  @Column({ type: 'boolean', default: true })
  public isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  public createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  public updatedAt!: Date;
}
