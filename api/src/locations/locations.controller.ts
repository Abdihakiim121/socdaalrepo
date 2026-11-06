import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { UserRole } from '../entities';
import {
  CreateCityDto,
  CreateRouteDto,
  CreateStationDto,
  StationQueryDto,
  UpdateCityDto,
  UpdateRouteDto,
  UpdateStationDto,
} from './locations.dto';
import { LocationsService } from './locations.service';

@Controller()
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  // Cities: anyone signed in can read; only the admin changes them.
  @Get('cities')
  listCities() {
    return this.locations.listCities();
  }

  @Roles(UserRole.ADMIN)
  @Post('cities')
  createCity(@Body() dto: CreateCityDto) {
    return this.locations.createCity(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('cities/:id')
  updateCity(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCityDto) {
    return this.locations.updateCity(id, dto);
  }

  // Boosteejos
  @Get('stations')
  listStations(@Query() query: StationQueryDto) {
    return this.locations.listStations(query);
  }

  @Get('stations/:id')
  getStation(@Param('id', ParseIntPipe) id: number) {
    return this.locations.findStation(id);
  }

  @Roles(UserRole.ADMIN)
  @Post('stations')
  createStation(@Body() dto: CreateStationDto) {
    return this.locations.createStation(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('stations/:id')
  updateStation(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStationDto) {
    return this.locations.updateStation(id, dto);
  }

  // Routes a boosteejo serves
  @Get('stations/:id/routes')
  listRoutes(@Param('id', ParseIntPipe) id: number) {
    return this.locations.listRoutes(id);
  }

  @Roles(UserRole.ADMIN)
  @Post('stations/:id/routes')
  createRoute(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateRouteDto) {
    return this.locations.createRoute(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('routes/:id')
  updateRoute(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRouteDto) {
    return this.locations.updateRoute(id, dto);
  }
}
