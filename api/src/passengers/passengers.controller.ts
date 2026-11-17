import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators';
import { CreatePassengerDto, PassengerQueryDto } from './passengers.dto';
import { PassengersService } from './passengers.service';

@Controller()
export class PassengersController {
  constructor(private readonly passengers: PassengersService) {}

  @Get('trips/:id/passengers')
  list(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.passengers.list(id, user);
  }

  @Post('trips/:id/passengers')
  create(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePassengerDto, @CurrentUser() user: AuthUser) {
    return this.passengers.create(id, dto, user);
  }

  @Post('passengers/:id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.passengers.cancel(id, user);
  }

  /** ?date=2026-11-17 (default today), or ?q=name-or-phone; admins may add &stationId=. */
  @Get('passengers')
  browse(@Query() query: PassengerQueryDto, @CurrentUser() user: AuthUser) {
    return this.passengers.browse(query, user);
  }
}
