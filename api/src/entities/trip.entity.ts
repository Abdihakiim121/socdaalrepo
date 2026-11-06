import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Bus } from './bus.entity';
import { Passenger } from './passenger.entity';
import { Route } from './route.entity';
import { User } from './user.entity';

export enum TripStatus {
  WAITING = 'waiting',
  BOARDING = 'boarding',
  DEPARTED = 'departed',
  CANCELLED = 'cancelled',
}

/** One bus making one journey on one route. The queue = a route's waiting/boarding trips by queue_position. */
@Entity('trips')
@Index(['routeId', 'status', 'queuePosition'])
export class Trip extends BaseEntity {
  @ManyToOne(() => Route, { nullable: false })
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @Column({ name: 'route_id' })
  routeId: number;

  @ManyToOne(() => Bus, { nullable: false })
  @JoinColumn({ name: 'bus_id' })
  bus: Bus;

  @Column({ name: 'bus_id' })
  busId: number;

  @Column({ name: 'driver_name', type: 'varchar', length: 100, nullable: true })
  driverName: string | null;

  @Column({ name: 'driver_phone', type: 'varchar', length: 30, nullable: true })
  driverPhone: string | null;

  /** 1 = first in line. Null once the trip has departed or been cancelled. */
  @Column({ name: 'queue_position', type: 'int', nullable: true })
  queuePosition: number | null;

  @Column({ name: 'arrived_at', type: 'datetime' })
  arrivedAt: Date;

  @Column({ name: 'departure_time', type: 'datetime', nullable: true })
  departureTime: Date | null;

  @Column({ type: 'enum', enum: TripStatus, default: TripStatus.WAITING })
  status: TripStatus;

  @Column({ name: 'departed_at', type: 'datetime', nullable: true })
  departedAt: Date | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: number;

  @OneToMany(() => Passenger, (p) => p.trip)
  passengers: Passenger[];
}
