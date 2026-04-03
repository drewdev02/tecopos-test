import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

export const INTERNAL_USER_ID_HEADER = 'x-user-id';
export const INTERNAL_TIMESTAMP_HEADER = 'x-internal-timestamp';
export const INTERNAL_SIGNATURE_HEADER = 'x-internal-signature';

type SignaturePayload = {
  userId: string;
  method: string;
  path: string;
  timestamp: string;
};

@Injectable()
export class InternalSignerService {
  private readonly secret: string;

  public constructor(configService: ConfigService) {
    this.secret = configService.getOrThrow<string>('gateway.internalSignatureSecret');
  }

  public sign(method: string, path: string, userId: string): { timestamp: string; signature: string } {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.buildSignature({
      userId,
      method,
      path,
      timestamp,
    });

    return {
      timestamp,
      signature,
    };
  }

  private buildSignature(payload: SignaturePayload): string {
    const canonical = this.buildCanonicalString(payload);
    return createHmac('sha256', this.secret).update(canonical).digest('hex');
  }

  private buildCanonicalString(payload: SignaturePayload): string {
    return [
      payload.userId,
      payload.method.toUpperCase(),
      payload.path,
      payload.timestamp,
    ].join(':');
  }
}
