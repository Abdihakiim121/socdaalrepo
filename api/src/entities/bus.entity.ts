import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/** A bus is registered once and can join the queue at any boosteejo. */
@Entity('buses')
export class Bus extends BaseEntity {
  @Column({ type: 'varchar', length: 30, unique: true })
  plate: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  type: string | null;

  @Column({ name: 'seat_count', type: 'int' })
  seatCount: number;

  @Column({ name: 'owner_name', type: 'varchar', length: 100, nullable: true })
  ownerName: string | null;

  @Column({ name: 'owner_phone', type: 'varchar', length: 30, nullable: true })
  ownerPhone: string | null;
}
