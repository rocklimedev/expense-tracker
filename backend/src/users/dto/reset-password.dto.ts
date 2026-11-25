import { IsByteLength, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  @IsByteLength(8, 72)
  password!: string;
}
