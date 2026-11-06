import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Trip } from './trip.entity';
import { User } from './user.entity';

export enum PassengerStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
}

@Entity('passengers')
@Index(['phone'])
export class Passenger extends BaseEntity {
  @ManyToOne(() => Trip, (trip) => trip.passengers, { nullable: false })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ name: 'trip_id' })
  tripId: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ type: 'int', default: 1 })
  seats: number;

  @Column({ type: 'enum', enum: PassengerStatus, default: PassengerStatus.ACTIVE })
  status: PassengerStatus;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: number;
}
