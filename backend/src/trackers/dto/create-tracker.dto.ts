import { IsNumber, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateTrackerDto {
  @IsString() @Length(2, 120) title!: string;
  @IsOptional() @IsString() @Length(0, 500) description?: string;

  @Matches(DATE_ONLY, { message: 'startDate must be YYYY-MM-DD' })
  startDate!: string;

  @IsOptional() @Matches(DATE_ONLY, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) budgetAmount?: number;
}
