import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/permissions';
import { ActivityEntry } from './activity-entry.model';

const PAGE_SIZE = 50;

@Controller('activity')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions(Permissions.USER_MANAGE, Permissions.EXPENSE_VIEW_ALL)
export class ActivityController {
  @Get()
  async list(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    const entries = await ActivityEntry.findAll({
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      offset: (Math.min(1_000_000, Math.max(1, page)) - 1) * PAGE_SIZE,
      limit: PAGE_SIZE + 1,
    });
    return { entries: entries.slice(0, PAGE_SIZE), hasMore: entries.length > PAGE_SIZE };
  }
}
