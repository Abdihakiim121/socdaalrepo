// Used by the TypeORM CLI for migrations: npm run migration:generate / migration:run
import { DataSource } from 'typeorm';
import { databaseOptions } from './config/database.config';

export default new DataSource(databaseOptions);
