import {
  ArrayMaxSize, ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString, Length,
} from 'class-validator';

export class BatchApproveDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  ids!: number[];

  @IsOptional() @IsString() @Length(0, 500) comment?: string;
}
