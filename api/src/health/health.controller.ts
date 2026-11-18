import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators';

/** For the server and uptime checks: is the API up, and can it reach the database? */
@Controller('health')
export class HealthController {
  constructor(private readonly ds: DataSource) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.ds.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'unreachable' });
    }
    return { status: 'ok', database: 'ok', time: new Date().toISOString() };
  }
}
