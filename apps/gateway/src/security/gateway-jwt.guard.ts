import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator.js';

type JwtPayload = {
  userId?: unknown;
};

type GatewayRequest = {
  headers: {
    authorization?: string;
  };
  user?: {
    userId: string;
  };
};

@Injectable()
export class GatewayJwtGuard implements CanActivate {
  public constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<GatewayRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({
        code: 'MISSING_BEARER_TOKEN',
        message: 'Missing or invalid bearer token',
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (typeof payload.userId !== 'string' || payload.userId.length === 0) {
        throw new UnauthorizedException({
          code: 'INVALID_JWT_PAYLOAD',
          message: 'JWT payload is invalid',
        });
      }

      request.user = {
        userId: payload.userId,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Access token is invalid or expired',
      });
    }
  }

  private extractTokenFromHeader(request: GatewayRequest): string | undefined {
    const authorization = request.headers.authorization;
    const [type, token] = authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
