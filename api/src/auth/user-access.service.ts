import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities';
import { AuthUser } from './auth.types';

const TTL_MS = 30_000;

/**
 * The signed-in user's current role, boosteejo and status, read from the database rather than
 * trusted from the token. Blocking a user or moving a manager to another boosteejo takes effect
 * on their next request, not when their token expires. Cached for 30 seconds per user and cleared
 * immediately when an admin changes the user.
 */
@Injectable()
export class UserAccessService {
  private readonly cache = new Map<number, { user: AuthUser | null; at: number }>();

  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  /** Null when the user no longer exists or is blocked. */
  async current(userId: number): Promise<AuthUser | null> {
    const hit = this.cache.get(userId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.user;

    const u = await this.users.findOne({
      where: { id: userId },
      select: { id: true, role: true, stationId: true, active: true },
    });
    const user: AuthUser | null = u && u.active ? { sub: u.id, role: u.role, stationId: u.stationId } : null;
    this.cache.set(userId, { user, at: Date.now() });
    return user;
  }

  invalidate(userId: number) {
    this.cache.delete(userId);
  }
}
