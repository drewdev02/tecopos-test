import { BadRequestException } from '@nestjs/common';

type HeaderValue = string | string[] | undefined;

type UserContextRequest = {
  headers: {
    'x-user-id'?: HeaderValue;
  };
};

export function getUserIdFromHeaders(request: UserContextRequest): string {
  const rawHeader = request.headers['x-user-id'];
  const value = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException({
      code: 'MISSING_USER_CONTEXT',
      message: 'Missing X-User-Id header',
    });
  }

  return value.trim();
}

type TrustedUserRequest = {
  trustedUser?: {
    userId?: string;
  };
};

export function getTrustedUserId(request: TrustedUserRequest): string {
  const userId = request.trustedUser?.userId;
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new BadRequestException({
      code: 'MISSING_TRUSTED_USER_CONTEXT',
      message: 'Missing trusted user context',
    });
  }

  return userId.trim();
}
