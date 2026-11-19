import {
  BadRequestException, Controller, Delete, Get, Param, ParseIntPipe, Post, Req,
  StreamableFile, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { memoryStorage } from 'multer';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permissions } from '../common/permissions';
import { AttachmentsService } from './attachments.service';
import { MAX_FILE_BYTES } from './file-validation';

@Controller()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('expenses/:expenseId/attachments')
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_BYTES, files: 1 },
    }),
  )
  upload(
    @Req() req,
    @Param('expenseId', ParseIntPipe) expenseId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Send the file in a form field named "file"');
    return this.attachments.upload(req.user, expenseId, file);
  }

  @Get('expenses/:expenseId/attachments')
  list(@Req() req, @Param('expenseId', ParseIntPipe) expenseId: number) {
    return this.attachments.list(req.user, expenseId);
  }

  @Get('attachments/:id/download')
  async download(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const file = await this.attachments.download(req.user, id);
    return new StreamableFile(file.buffer, {
      type: file.mimeType,
      disposition: `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      length: file.buffer.length,
    });
  }

  @Delete('attachments/:id')
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.attachments.remove(req.user, id);
  }
}
