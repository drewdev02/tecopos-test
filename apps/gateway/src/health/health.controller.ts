import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../security/public.decorator.js';

@Controller()
export class HealthController {
  @Public()
  @SkipThrottle()
  @Get('/health/live')
  public live(): { status: string; service: string } {
    return {
      status: 'ok',
      service: 'gateway',
    };
  }

  @Public()
  @SkipThrottle()
  @Get('/health/ready')
  public ready(): { status: string; service: string } {
    return {
      status: 'ready',
      service: 'gateway',
    };
  }

  @Public()
  @SkipThrottle()
  @Get('/health')
  public health(): { status: string; service: string } {
    return this.live();
  }
}
