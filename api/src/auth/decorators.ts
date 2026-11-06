import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities';
import { AuthUser } from './auth.types';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Endpoint needs no login (only the login itself). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Only these roles may call the endpoint. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);

/** The signed-in user, from the token. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
