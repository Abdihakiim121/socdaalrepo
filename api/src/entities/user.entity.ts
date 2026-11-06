import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Station } from './station.entity';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
}

@Entity('users')
export class User extends BaseEntity {
  /** Managers belong to one boosteejo; admins have none. */
  @ManyToOne(() => Station, { nullable: true })
  @JoinColumn({ name: 'station_id' })
  station: Station | null;

  @Column({ name: 'station_id', nullable: true })
  stationId: number | null;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 30, unique: true })
  phone: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.MANAGER })
  role: UserRole;

  @Column({ name: 'pin_hash', select: false })
  pinHash: string;

  @Column({ default: true })
  active: boolean;
}
