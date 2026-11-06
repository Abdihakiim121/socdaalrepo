import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { UserRole } from '../entities';
import { CreateTripDto, MoveTripDto, TripRecordsQueryDto, UpdateTripDto } from './trips.dto';
import { TripsService } from './trips.service';

@Controller()
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get('stations/:id/today')
  today(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.trips.today(id, user);
  }

  @Get('routes/:id/queue')
  queue(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.trips.getQueue(id, user);
  }

  /** Register a bus arriving at the boosteejo; it joins the end of the queue. */
  @Post('trips')
  create(@Body() dto: CreateTripDto, @CurrentUser() user: AuthUser) {
    return this.trips.create(dto, user);
  }

  @Get('trips')
  records(@Query() query: TripRecordsQueryDto, @CurrentUser() user: AuthUser) {
    return this.trips.records(query, user);
  }

  @Get('trips/:id')
  getTrip(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.trips.getTrip(id, user);
  }

  @Patch('trips/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTripDto, @CurrentUser() user: AuthUser) {
    return this.trips.update(id, dto, user);
  }

  @Post('trips/:id/move')
  @HttpCode(200)
  move(@Param('id', ParseIntPipe) id: number, @Body() dto: MoveTripDto, @CurrentUser() user: AuthUser) {
    return this.trips.move(id, dto.direction, user);
  }

  @Post('trips/:id/depart')
  @HttpCode(200)
  depart(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.trips.depart(id, user);
  }

  @Post('trips/:id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.trips.cancel(id, user);
  }

  @Roles(UserRole.ADMIN)
  @Post('trips/:id/reopen')
  @HttpCode(200)
  reopen(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.trips.reopen(id, user);
  }
}
