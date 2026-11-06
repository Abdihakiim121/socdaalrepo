import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { City } from './city.entity';
import { Route } from './route.entity';

/** MySQL returns DECIMAL as a string; give the app a number. */
const decimalToNumber = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

/** A boosteejo. A city can have many, e.g. Mogadishu's Garoowe boosteejo and its Kismaayo boosteejo. */
@Entity('stations')
@Index(['cityId', 'name'], { unique: true })
export class Station extends BaseEntity {
  @ManyToOne(() => City, (city) => city.stations, { nullable: false })
  @JoinColumn({ name: 'city_id' })
  city: City;

  @Column({ name: 'city_id' })
  cityId: number;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 100, nullable: true })
  district: string | null;

  @Column({ length: 200, nullable: true })
  landmark: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: decimalToNumber })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: decimalToNumber })
  longitude: number | null;

  @Column({ name: 'contact_name', length: 100, nullable: true })
  contactName: string | null;

  @Column({ name: 'contact_phone', length: 30, nullable: true })
  contactPhone: string | null;

  @Column({ name: 'opening_hours', length: 100, nullable: true })
  openingHours: string | null;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => Route, (route) => route.station)
  routes: Route[];
}
