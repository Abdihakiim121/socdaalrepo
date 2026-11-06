import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Station } from './station.entity';

@Entity('cities')
export class City extends BaseEntity {
  @Column({ length: 100, unique: true })
  name: string;

  @Column({ length: 100, nullable: true })
  region: string | null;

  @OneToMany(() => Station, (station) => station.city)
  stations: Station[];
}
