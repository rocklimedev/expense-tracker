import { IsDateString, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString() @Length(2, 60) category!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9_999_999_999.99) amount!: number;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsDateString() expenseDate!: string;
  @IsOptional() @IsString() @Length(0, 500) description?: string;
  @IsOptional() @IsString() @Length(0, 120) toldBy?: string;
  @IsOptional() @IsString() @Length(0, 500) reason?: string;
  @IsOptional() @IsString() @Length(0, 120) paidTo?: string;
}
