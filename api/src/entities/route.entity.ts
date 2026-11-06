import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { City } from './city.entity';
import { Station } from './station.entity';

/** A destination a boosteejo serves. The origin is the boosteejo's own city. */
@Entity('routes')
@Index(['stationId', 'destinationCityId'], { unique: true })
export class Route extends BaseEntity {
  @ManyToOne(() => Station, (station) => station.routes, { nullable: false })
  @JoinColumn({ name: 'station_id' })
  station: Station;

  @Column({ name: 'station_id' })
  stationId: number;

  @ManyToOne(() => City, { nullable: false })
  @JoinColumn({ name: 'destination_city_id' })
  destinationCity: City;

  @Column({ name: 'destination_city_id' })
  destinationCityId: number;

  @Column({ default: true })
  active: boolean;
}
