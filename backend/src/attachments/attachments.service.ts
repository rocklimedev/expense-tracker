import {
  BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Permissions } from '../common/permissions';
import { AuthUser } from '../common/types';
import { Expense } from '../expenses/models/expense.model';
import { ExpenseStatus } from '../expenses/expense-workflow';
import { STORAGE_PROVIDER, StorageProvider } from '../storage/storage.interface';
import { Attachment } from './models/attachment.model';
import {
  MAX_ATTACHMENTS_PER_EXPENSE, detectFileType, sanitizeFileName,
} from './file-validation';

// Receipts can only change while the expense is being prepared or was sent back
const EDITABLE_STATUSES = [ExpenseStatus.DRAFT, ExpenseStatus.REJECTED];

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  async upload(actor: AuthUser, expenseId: string, file: Express.Multer.File) {
    const expense = await this.loadExpense(expenseId);
    this.assertOwner(actor, expense, 'Only the expense owner can add receipts');
    this.assertEditable(expense);

    const count = await Attachment.count({ where: { expenseId } });
    if (count >= MAX_ATTACHMENTS_PER_EXPENSE) {
      throw new BadRequestException(
        `An expense can have at most ${MAX_ATTACHMENTS_PER_EXPENSE} attachments`,
      );
    }

    const { ext, mime } = detectFileType(file.buffer);
    const storageKey = this.buildStorageKey(ext);

    await this.storage.put(storageKey, file.buffer, mime);
    try {
      return await Attachment.create({
        expenseId,
        storageKey,
        originalName: sanitizeFileName(file.originalname),
        mimeType: mime,
        sizeBytes: file.size,
        uploadedById: actor.id,
      });
    } catch (err) {
      // DB insert failed, so remove the orphaned file
      await this.storage.delete(storageKey).catch(() => undefined);
      throw err;
    }
  }

  async list(actor: AuthUser, expenseId: string) {
    const expense = await this.loadExpense(expenseId);
    this.assertCanView(actor, expense);
    return Attachment.findAll({
      where: { expenseId },
      attributes: { exclude: ['storageKey'] },
      order: [['createdAt', 'ASC']],
    });
  }

  async download(actor: AuthUser, id: string) {
    const attachment = await this.loadAttachment(id);
    const expense = await this.loadExpense(attachment.expenseId);
    this.assertCanView(actor, expense);

    const buffer = await this.storage.get(attachment.storageKey);
    return {
      buffer,
      mimeType: attachment.mimeType,
      originalName: attachment.originalName,
    };
  }

  async remove(actor: AuthUser, id: string) {
    const attachment = await this.loadAttachment(id);
    const expense = await this.loadExpense(attachment.expenseId);
    this.assertOwner(actor, expense, 'Only the expense owner can remove receipts');
    this.assertEditable(expense);

    await attachment.destroy();
    // Remove the file after the DB row is gone. A leftover file is harmless; a dangling row is not.
    await this.storage.delete(attachment.storageKey).catch((err) =>
      this.logger.warn(`Could not delete ${attachment.storageKey}: ${err.message}`),
    );
    return { deleted: true };
  }

  // ---------- helpers ----------

  private buildStorageKey(ext: string): string {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `receipts/${yyyy}/${mm}/${randomUUID()}.${ext}`;
  }

  private async loadExpense(id: string) {
    const expense = await Expense.findByPk(id);
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  private async loadAttachment(id: string) {
    const attachment = await Attachment.findByPk(id);
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  private assertOwner(actor: AuthUser, expense: Expense, message: string) {
    if (expense.employeeId !== actor.id) throw new ForbiddenException(message);
  }

  private assertCanView(actor: AuthUser, expense: Expense) {
    const canViewAll = actor.permissions.includes(Permissions.EXPENSE_VIEW_ALL);
    if (!canViewAll && expense.employeeId !== actor.id) {
      throw new ForbiddenException('You do not have access to this expense');
    }
  }

  private assertEditable(expense: Expense) {
    if (!EDITABLE_STATUSES.includes(expense.status)) {
      throw new BadRequestException(
        `Attachments cannot be changed while the expense is ${expense.status}`,
      );
    }
  }
}
