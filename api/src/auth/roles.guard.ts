import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities';
import { AuthUser } from './auth.types';
import { ROLES } from './decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (!roles || roles.length === 0) return true;
    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    if (user && roles.includes(user.role)) return true;
    throw new ForbiddenException('You do not have permission for this');
  }
}
