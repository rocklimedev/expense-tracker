import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { StorageModule } from '../storage/storage.module';
import { Expense } from '../expenses/models/expense.model';
import { Attachment } from './models/attachment.model';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  imports: [StorageModule, SequelizeModule.forFeature([Attachment, Expense])],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
