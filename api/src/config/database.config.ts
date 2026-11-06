import 'dotenv/config';
import { DataSourceOptions } from 'typeorm';
import { ENTITIES } from '../entities';

export const databaseOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'socdaal',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'socdaal',
  // Store and read dates in Mogadishu time so "today" means the boosteejo's day.
  timezone: process.env.DB_TIMEZONE ?? '+03:00',
  charset: 'utf8mb4',
  entities: ENTITIES,
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
};
