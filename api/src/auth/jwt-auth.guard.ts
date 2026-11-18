import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from './auth.types';
import { IS_PUBLIC } from './decorators';
import { UserAccessService } from './user-access.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly access: UserAccessService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Please sign in');

    let claims: AuthUser;
    try {
      claims = await this.jwt.verifyAsync<AuthUser>(token);
    } catch {
      throw new UnauthorizedException('Your session has expired, please sign in again');
    }

    // Use the user's current role and boosteejo, not the ones in the token, and refuse blocked users.
    const user = await this.access.current(claims.sub);
    if (!user) throw new UnauthorizedException('Your account is blocked. Ask the admin.');
    req.user = user;
    return true;
  }
}
