import { IsDateString, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class RecordPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
  @IsDateString() paidOn!: string;
  @IsOptional() @IsString() @Length(0, 100) reference?: string;
}
