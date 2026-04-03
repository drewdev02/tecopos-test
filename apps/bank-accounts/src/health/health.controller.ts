import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  public constructor(private readonly dataSource: DataSource) {}

  @Get('/health/live')
  public live(): { status: string; service: string } {
    return {
      status: 'ok',
      service: 'bank-accounts',
    };
  }

  @Get('/health/ready')
  public async ready(): Promise<{ status: string; service: string; checks: { database: string } }> {
    await this.dataSource.query('SELECT 1');

    return {
      status: 'ready',
      service: 'bank-accounts',
      checks: {
        database: 'up',
      },
    };
  }

  @Get('/health')
  public health(): { status: string; service: string } {
    return this.live();
  }
}
