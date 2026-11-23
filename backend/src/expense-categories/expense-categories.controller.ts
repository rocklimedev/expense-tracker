import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, Length } from 'class-validator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/permissions';
import { ExpenseCategoriesService } from './expense-categories.service';

class CreateExpenseCategoryDto {
  @IsString()
  @Length(2, 60)
  name!: string;
}

@Controller('expense-categories')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ExpenseCategoriesController {
  constructor(private readonly categories: ExpenseCategoriesService) {}

  @Get()
  list() {
    return this.categories.list();
  }

  @Post()
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  create(@Body() dto: CreateExpenseCategoryDto) {
    return this.categories.create(dto.name);
  }
}
