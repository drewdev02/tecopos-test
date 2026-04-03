import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { GatewayJwtGuard } from './gateway-jwt.guard.js';

type GatewayRequestMock = {
  headers: {
    authorization?: string;
  };
  user?: {
    userId: string;
  };
};

type ExecutionContextMock = {
  getHandler: jest.Mock;
  getClass: jest.Mock;
  switchToHttp: jest.Mock;
};

describe('GatewayJwtGuard', () => {
  let guard: GatewayJwtGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn(),
    };

    reflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayJwtGuard,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: Reflector,
          useValue: reflector,
        },
      ],
    }).compile();

    guard = module.get<GatewayJwtGuard>(GatewayJwtGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildContext = (request: GatewayRequestMock): ExecutionContextMock => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  });

  it('allows public route', async () => {
    // AI-assisted test case
    const request: GatewayRequestMock = { headers: {} };
    const context = buildContext(request);
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects missing bearer token', async () => {
    // AI-assisted test case
    const request: GatewayRequestMock = { headers: {} };
    const context = buildContext(request);
    reflector.getAllAndOverride.mockReturnValue(false);

    const activation = guard.canActivate(context as never);

    await expect(activation).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(activation).rejects.toMatchObject({
      response: {
        code: 'MISSING_BEARER_TOKEN',
        message: 'Missing or invalid bearer token',
      },
    });
  });

  it('rejects invalid token', async () => {
    // AI-assisted test case
    const request: GatewayRequestMock = {
      headers: { authorization: 'Bearer invalid-token' },
    };
    const context = buildContext(request);
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

    await expect(guard.canActivate(context as never)).rejects.toMatchObject({
      response: {
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Access token is invalid or expired',
      },
    });
  });

  it('accepts valid token and attaches user context', async () => {
    // AI-assisted test case
    const request: GatewayRequestMock = {
      headers: { authorization: 'Bearer valid-token' },
    };
    const context = buildContext(request);
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue({ userId: 'user-123' });

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual({ userId: 'user-123' });
  });
});
