import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { recordActivity } from '../activity/record-activity';
import { TrackersService } from './trackers.service';

@Injectable()
export class TrackersScheduler {
  constructor(private readonly trackers: TrackersService) {}

  // 01:00 every day, in the app timezone
  @Cron('0 1 * * *', { timeZone: process.env.APP_TIMEZONE ?? 'UTC' })
  async generateDueRecurringExpenses() {
    const { generated } = await this.trackers.runDueForAll();
    if (generated > 0) {
      await recordActivity({
        actorId: null,
        actorName: 'System',
        action: 'generateRecurringExpenses',
        method: 'SYSTEM',
        resource: `${generated} recurring expense draft(s)`,
      });
    }
  }
}
