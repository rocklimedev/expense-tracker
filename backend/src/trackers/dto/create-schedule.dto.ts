import {
  IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, Min,
} from 'class-validator';
import { Frequency } from '../recurrence';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateScheduleDto {
  @IsIn(Object.values(Frequency)) frequency!: Frequency;

  @IsOptional() @IsInt() @Min(1) @Max(365) interval?: number;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;

  @IsString() @Length(2, 60) category!: string;

  @IsOptional() @IsString() @Length(0, 500) description?: string;

  @Matches(DATE_ONLY, { message: 'startDate must be YYYY-MM-DD' })
  startDate!: string;

  @IsOptional() @Matches(DATE_ONLY, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;
}
