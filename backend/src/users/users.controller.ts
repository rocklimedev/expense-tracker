import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permissions } from '../common/permissions';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @RequirePermissions(Permissions.USER_MANAGE)
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get()
  @RequirePermissions(Permissions.USER_MANAGE)
  findAll() {
    return this.users.findAll();
  }

  @Get('roles')
  @RequirePermissions(Permissions.USER_MANAGE)
  findRoles() {
    return this.users.findRoles();
  }
}
