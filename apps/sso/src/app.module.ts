import { Controller, Get, Module } from '@nestjs/common';

@Controller()
class HealthController {
  @Get('/health')
  public health(): { status: string; service: string } {
    return {
      status: 'ok',
      service: 'sso',
    };
  }
}

@Module({
  controllers: [HealthController],
})
export class AppModule {}
