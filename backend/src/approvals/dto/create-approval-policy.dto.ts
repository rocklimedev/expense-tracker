import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Min,
  ValidateNested,
} from 'class-validator';
import { APPROVAL_PERMISSIONS } from '../../common/permissions';

export class ApprovalStepDto {
  @IsString() @Length(2, 100) label!: string;
  @IsIn(APPROVAL_PERMISSIONS) requiredPermission!: string;
}

export class CreateApprovalPolicyDto {
  @IsString() @Length(2, 120) name!: string;
  @IsOptional() @IsString() @Length(2, 60) category?: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) minAmount!: number;
  @IsOptional() @IsInt() priority?: number;

  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps!: ApprovalStepDto[];
}
