import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  Unique,
} from 'sequelize-typescript';
import { Expense } from '../../expenses/models/expense.model';

@Table({ tableName: 'attachments' })
export class Attachment extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => Expense)
  @AllowNull(false)
  @Column(DataType.UUID)
  expenseId!: string;

  @BelongsTo(() => Expense)
  expense!: Expense;

  // Random server-generated path on the file server, never the user's file name
  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(255))
  storageKey!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  originalName!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  mimeType!: string;

  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  sizeBytes!: number;

  @AllowNull(false)
  @Column(DataType.UUID)
  uploadedById!: string;
}
