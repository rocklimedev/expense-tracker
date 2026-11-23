import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'expense_categories', timestamps: false })
export class ExpenseCategory extends Model {
  @Column({ type: DataType.STRING(60), primaryKey: true })
  code!: string;
}
