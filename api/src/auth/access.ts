import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../entities';
import { AuthUser } from './auth.types';

export const isAdmin = (user: AuthUser) => user.role === UserRole.ADMIN;

/** Managers only work on their own boosteejo; admins can work on any. */
export function assertStationAccess(user: AuthUser, stationId: number): void {
  if (isAdmin(user)) return;
  if (user.stationId !== stationId) {
    throw new ForbiddenException('This record belongs to another boosteejo');
  }
}
