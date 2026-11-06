import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CreateBusDto, UpdateBusDto } from './buses.dto';
import { BusesService } from './buses.service';

/** Managers and the admin can both register and edit buses. */
@Controller('buses')
export class BusesController {
  constructor(private readonly buses: BusesService) {}

  @Get()
  search(@Query('plate') plate?: string) {
    return this.buses.search(plate);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.buses.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBusDto) {
    return this.buses.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBusDto) {
    return this.buses.update(id, dto);
  }
}
