import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ExpensesModule } from '../expenses/expenses.module';
import { ExpenseCategoriesModule } from '../expense-categories/expense-categories.module';
import { Expense } from '../expenses/models/expense.model';
import { Tracker } from './models/tracker.model';
import { TrackerSchedule } from './models/tracker-schedule.model';
import { TrackersController } from './trackers.controller';
import { TrackersService } from './trackers.service';
import { TrackersScheduler } from './trackers.scheduler';

@Module({
  imports: [
    SequelizeModule.forFeature([Tracker, TrackerSchedule, Expense]),
    ExpensesModule,
    ExpenseCategoriesModule,
  ],
  controllers: [TrackersController],
  providers: [TrackersService, TrackersScheduler],
})
export class TrackersModule {}
