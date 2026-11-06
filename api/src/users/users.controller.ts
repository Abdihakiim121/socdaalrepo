import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { UserRole } from '../entities';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { UsersService } from './users.service';

/** Manager accounts: admin only. */
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query('stationId') stationId?: string) {
    return this.users.list(stationId ? Number(stationId) : undefined);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }
}
