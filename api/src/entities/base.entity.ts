import { BeforeInsert, BeforeUpdate, Column, DeleteDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // Set by the API, not by MySQL's CURRENT_TIMESTAMP. MySQL would use its own server's time zone,
  // while the API reads and writes dates in Mogadishu time (see database.config.ts). Setting them
  // here keeps "registered at" times and the start of "today" right on any server.
  @Column({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;

  // Records are never hard-deleted; TypeORM's softDelete fills this in.
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @BeforeInsert()
  protected stampCreated() {
    const now = new Date();
    this.createdAt ??= now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  protected stampUpdated() {
    this.updatedAt = new Date();
  }
}
