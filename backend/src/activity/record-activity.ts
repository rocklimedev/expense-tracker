import { Logger } from '@nestjs/common';
import { ActivityEntry } from './activity-entry.model';

const logger = new Logger('ActivityLog');

export async function recordActivity(entry: Pick<ActivityEntry, 'actorId' | 'actorName' | 'action' | 'method' | 'resource'>) {
  try {
    await ActivityEntry.create(entry);
  } catch (error) {
    // A failed log write cannot undo an application change that already committed.
    logger.error(`Could not record ${entry.action}`, error instanceof Error ? error.stack : undefined);
  }
}
