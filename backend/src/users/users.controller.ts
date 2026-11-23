import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permissions } from '../common/permissions';
import { AuthUser } from '../common/types';
import { RbacService } from '../rbac/rbac.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly rbac: RbacService,
  ) {}

  @Post()
  @RequirePermissions(Permissions.USER_MANAGE)
  create(@Body() dto: CreateUserDto, @Req() request: { user: AuthUser }) {
    return this.users.create(dto, request.user);
  }

  @Get()
  @RequirePermissions(Permissions.USER_MANAGE)
  findAll() {
    return this.users.findAll();
  }

  @Get('roles')
  @RequirePermissions(Permissions.USER_MANAGE)
  findRoles(@Req() request: { user: AuthUser }) {
    return this.rbac.listAssignableRoles(request.user);
  }
}
