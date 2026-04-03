import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

const USER_ID_HEADER = 'x-user-id';
const TIMESTAMP_HEADER = 'x-internal-timestamp';
const SIGNATURE_HEADER = 'x-internal-signature';

type HeaderValue = string | string[] | undefined;

type VerificationInput = {
  method: string;
  path: string;
  headers: Record<string, HeaderValue>;
};

export type VerificationResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      code: 'MISSING_INTERNAL_SIGNATURE' | 'INVALID_INTERNAL_SIGNATURE' | 'EXPIRED_INTERNAL_SIGNATURE';
      message: string;
    };

@Injectable()
export class GatewayTrustVerifierService {
  private readonly secret: string;
  private readonly maxSkewSeconds: number;

  public constructor(configService: ConfigService) {
    this.secret = configService.getOrThrow<string>('bank.internalSignatureSecret');
    this.maxSkewSeconds = configService.getOrThrow<number>('bank.internalSignatureMaxSkewSeconds');
  }

  public verify(input: VerificationInput): VerificationResult {
    const userId = this.readHeader(input.headers, USER_ID_HEADER)?.trim();
    const timestamp = this.readHeader(input.headers, TIMESTAMP_HEADER)?.trim();
    const signature = this.readHeader(input.headers, SIGNATURE_HEADER)?.trim();

    if (!userId || !timestamp || !signature) {
      return {
        ok: false,
        code: 'MISSING_INTERNAL_SIGNATURE',
        message: 'Missing required internal trust headers',
      };
    }

    const timestampSeconds = Number.parseInt(timestamp, 10);
    if (Number.isNaN(timestampSeconds)) {
      return {
        ok: false,
        code: 'INVALID_INTERNAL_SIGNATURE',
        message: 'Invalid internal timestamp',
      };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestampSeconds) > this.maxSkewSeconds) {
      return {
        ok: false,
        code: 'EXPIRED_INTERNAL_SIGNATURE',
        message: 'Internal signature timestamp is outside allowed clock skew',
      };
    }

    const canonical = this.buildCanonicalString({
      userId,
      method: input.method,
      path: input.path,
      timestamp,
    });

    const expected = createHmac('sha256', this.secret).update(canonical).digest('hex');

    if (!this.isSignatureMatch(expected, signature)) {
      return {
        ok: false,
        code: 'INVALID_INTERNAL_SIGNATURE',
        message: 'Internal signature is invalid',
      };
    }

    return {
      ok: true,
      userId,
    };
  }

  private buildCanonicalString(input: {
    userId: string;
    method: string;
    path: string;
    timestamp: string;
  }): string {
    return [input.userId, input.method.toUpperCase(), input.path, input.timestamp].join(':');
  }

  private readHeader(headers: Record<string, HeaderValue>, name: string): string | undefined {
    const raw = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
    if (Array.isArray(raw)) {
      return raw[0];
    }

    return raw;
  }

  private isSignatureMatch(expectedHex: string, receivedHex: string): boolean {
    const expected = Buffer.from(expectedHex, 'hex');
    const received = Buffer.from(receivedHex, 'hex');

    if (expected.length === 0 || received.length === 0 || expected.length !== received.length) {
      return false;
    }

    return timingSafeEqual(expected, received);
  }
}
