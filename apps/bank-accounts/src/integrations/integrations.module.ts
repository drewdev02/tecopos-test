import { Module } from '@nestjs/common';
import { FETCH_CLIENT, MockBankClient } from './mock-bank.client.js';

@Module({
  providers: [
    {
      provide: FETCH_CLIENT,
      useValue: fetch,
    },
    MockBankClient,
  ],
  exports: [MockBankClient],
})
export class IntegrationsModule {}
