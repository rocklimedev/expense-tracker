import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsUUID,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class BatchApproveDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  ids!: string[];

  @IsOptional() @IsString() @Length(0, 500) comment?: string;
}
