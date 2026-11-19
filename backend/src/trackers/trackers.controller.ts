import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permissions } from '../common/permissions';
import { CreateExpenseDto } from '../expenses/dto/create-expense.dto';
import { ExpenseStatus } from '../expenses/expense-workflow';
import { TrackersService } from './trackers.service';
import { CreateTrackerDto } from './dto/create-tracker.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { SubmitDraftsDto } from './dto/submit-drafts.dto';

@Controller('trackers')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class TrackersController {
  constructor(private readonly trackers: TrackersService) {}

  @Post()
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  create(@Req() req, @Body() dto: CreateTrackerDto) {
    return this.trackers.create(req.user, dto);
  }

  @Get()
  list(@Req() req) {
    return this.trackers.list(req.user);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.trackers.findVisible(req.user, id);
  }

  @Post(':id/close')
  close(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.trackers.close(req.user, id);
  }

  @Get(':id/summary')
  summary(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.trackers.summary(req.user, id);
  }

  @Get(':id/expenses')
  expenses(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: ExpenseStatus,
  ) {
    return this.trackers.listExpenses(req.user, id, { from, to, status });
  }

  @Post(':id/expenses')
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  addExpense(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.trackers.addExpense(req.user, id, dto);
  }

  @Get(':id/schedules')
  schedules(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.trackers.listSchedules(req.user, id);
  }

  @Post(':id/schedules')
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  createSchedule(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.trackers.createSchedule(req.user, id, dto);
  }

  @Post(':id/schedules/:scheduleId/stop')
  stopSchedule(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
  ) {
    return this.trackers.stopSchedule(req.user, id, scheduleId);
  }

  @Post(':id/generate')
  generate(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.trackers.generate(req.user, id);
  }

  @Post(':id/submit-drafts')
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  submitDrafts(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitDraftsDto,
  ) {
    return this.trackers.submitDrafts(req.user, id, dto);
  }
}
