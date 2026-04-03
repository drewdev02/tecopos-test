import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GatewayTrustVerifierService } from './gateway-trust-verifier.service.js';

type RequestWithTrustContext = {
  method: string;
  originalUrl?: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  trustedUser?: {
    userId: string;
  };
};

@Injectable()
export class GatewayTrustGuard implements CanActivate {
  public constructor(private readonly verifier: GatewayTrustVerifierService) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithTrustContext>();

    const verification = this.verifier.verify({
      method: request.method,
      path: request.originalUrl ?? request.url,
      headers: request.headers,
    });

    if (!verification.ok) {
      throw new UnauthorizedException({
        code: verification.code,
        message: verification.message,
      });
    }

    request.trustedUser = {
      userId: verification.userId,
    };

    return true;
  }
}
