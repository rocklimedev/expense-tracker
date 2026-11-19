import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TrackersService } from './trackers.service';

@Injectable()
export class TrackersScheduler {
  constructor(private readonly trackers: TrackersService) {}

  // 01:00 every day, in the app timezone
  @Cron('0 1 * * *', { timeZone: process.env.APP_TIMEZONE ?? 'UTC' })
  async generateDueRecurringExpenses() {
    await this.trackers.runDueForAll();
  }
}
