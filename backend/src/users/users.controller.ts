import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permissions } from '../common/permissions';
import { AuthUser } from '../common/types';
import { RbacService } from '../rbac/rbac.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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

  @Get('expense-requesters')
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  listExpenseRequesters() {
    return this.users.listExpenseRequesters();
  }

  @Patch(':id')
  @RequirePermissions(Permissions.USER_MANAGE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @Req() request: { user: AuthUser }) {
    return this.users.update(id, dto, request.user);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.USER_MANAGE)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() request: { user: AuthUser }) {
    return this.users.remove(id, request.user);
  }

  @Patch(':id/password')
  @RequirePermissions(Permissions.USER_MANAGE)
  resetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetPasswordDto, @Req() request: { user: AuthUser }) {
    return this.users.resetPassword(id, dto.password, request.user);
  }
}
