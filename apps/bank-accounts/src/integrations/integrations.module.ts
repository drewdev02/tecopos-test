import { Module } from '@nestjs/common';
import { FETCH_CLIENT, MockBankClient } from './mock-bank.client.js';
import { RandomBankClient } from './random-bank.client.js';

@Module({
  providers: [
    {
      provide: FETCH_CLIENT,
      useValue: fetch,
    },
    RandomBankClient,
    MockBankClient,
  ],
  exports: [MockBankClient],
})
export class IntegrationsModule {}
