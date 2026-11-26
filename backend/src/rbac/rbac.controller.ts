import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsBoolean, IsString, MaxLength, Matches } from 'class-validator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/permissions';
import { AuthUser } from '../common/types';
import { RbacService } from './rbac.service';

class RoleNameDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/)
  name!: string;
}

class UpdateGrantDto {
  @IsBoolean()
  granted!: boolean;
}

@Controller('rbac')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions(Permissions.ROLE_MANAGE)
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('roles')
  getMatrix() {
    return this.rbac.getMatrix();
  }

  @Post('roles')
  createRole(@Body() dto: RoleNameDto, @Req() request: { user: AuthUser }) {
    return this.rbac.createRole(dto.name, request.user);
  }

  @Patch('roles/:roleId')
  @HttpCode(204)
  renameRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: RoleNameDto,
    @Req() request: { user: AuthUser },
  ) {
    return this.rbac.renameRole(roleId, dto.name, request.user);
  }

  @Delete('roles/:roleId')
  @HttpCode(204)
  deleteRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Req() request: { user: AuthUser },
  ) {
    return this.rbac.deleteRole(roleId, request.user);
  }

  @Put('roles/:roleId/permissions/:code')
  @HttpCode(204)
  setGrant(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('code') code: string,
    @Body() dto: UpdateGrantDto,
    @Req() request: { user: AuthUser },
  ) {
    return this.rbac.setGrant(roleId, code, dto.granted, request.user);
  }
}
