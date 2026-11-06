import { UserRole } from '../entities';

/** What the login token carries and what every request knows about the signed-in user. */
export interface AuthUser {
  sub: number;
  role: UserRole;
  stationId: number | null;
}
