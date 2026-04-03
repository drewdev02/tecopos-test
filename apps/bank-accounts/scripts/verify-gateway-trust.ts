import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import { GatewayTrustVerifierService } from '../src/security/gateway-trust-verifier.service.js';

type HeaderValue = string | string[] | undefined;

function sign(secret: string, userId: string, method: string, path: string, timestamp: string): string {
  const canonical = [userId, method.toUpperCase(), path, timestamp].join(':');
  return createHmac('sha256', secret).update(canonical).digest('hex');
}

function createVerifier(secret: string, skewSeconds = 90): GatewayTrustVerifierService {
  const configStub = {
    get<T>(key: string): T | undefined {
      if (key === 'bank.internalSignatureSecret') {
        return secret as T;
      }

      if (key === 'bank.internalSignatureMaxSkewSeconds') {
        return skewSeconds as T;
      }

      return undefined;
    },
    getOrThrow<T>(key: string): T {
      if (key === 'bank.internalSignatureSecret') {
        return secret as T;
      }

      if (key === 'bank.internalSignatureMaxSkewSeconds') {
        return skewSeconds as T;
      }

      throw new Error(`Unexpected config key: ${key}`);
    },
  } as ConfigService;

  return new GatewayTrustVerifierService(configStub);
}

function buildHeaders(input: {
  userId: string;
  method: string;
  path: string;
  timestamp: string;
  signature?: string;
}): Record<string, HeaderValue> {
  return {
    'x-user-id': input.userId,
    'x-internal-timestamp': input.timestamp,
    'x-internal-signature': input.signature,
  };
}

function run(): void {
  const secret = 'test-internal-signature-secret';
  const verifier = createVerifier(secret, 90);
  const userId = 'user-123';
  const method = 'GET';
  const path = '/accounts?page=1';
  const currentTimestamp = Math.floor(Date.now() / 1000).toString();

  const validSignature = sign(secret, userId, method, path, currentTimestamp);
  const validResult = verifier.verify({
    method,
    path,
    headers: buildHeaders({
      userId,
      method,
      path,
      timestamp: currentTimestamp,
      signature: validSignature,
    }),
  });
  assert.equal(validResult.ok, true, 'valid signature should pass');

  const missingResult = verifier.verify({
    method,
    path,
    headers: buildHeaders({
      userId,
      method,
      path,
      timestamp: currentTimestamp,
    }),
  });
  assert.equal(missingResult.ok, false, 'missing signature should fail');

  const tamperedResult = verifier.verify({
    method,
    path,
    headers: buildHeaders({
      userId,
      method,
      path,
      timestamp: currentTimestamp,
      signature: `${validSignature.slice(0, -2)}aa`,
    }),
  });
  assert.equal(tamperedResult.ok, false, 'tampered signature should fail');
  if (!tamperedResult.ok) {
    assert.equal(tamperedResult.code, 'INVALID_INTERNAL_SIGNATURE');
  }

  const expiredTimestamp = (Math.floor(Date.now() / 1000) - 300).toString();
  const expiredSignature = sign(secret, userId, method, path, expiredTimestamp);
  const expiredResult = verifier.verify({
    method,
    path,
    headers: buildHeaders({
      userId,
      method,
      path,
      timestamp: expiredTimestamp,
      signature: expiredSignature,
    }),
  });
  assert.equal(expiredResult.ok, false, 'expired timestamp should fail');
  if (!expiredResult.ok) {
    assert.equal(expiredResult.code, 'EXPIRED_INTERNAL_SIGNATURE');
  }

  console.log('gateway trust verification: PASS');
  console.log('- valid signature passes');
  console.log('- missing signature fails');
  console.log('- tampered signature fails');
  console.log('- expired timestamp fails');
}

run();
