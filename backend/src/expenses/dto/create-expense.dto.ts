import { IsDateString, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString() @Length(2, 60) category!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsDateString() expenseDate!: string;
  @IsOptional() @IsString() @Length(0, 500) description?: string;
}
