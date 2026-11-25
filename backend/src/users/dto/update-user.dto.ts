import { IsByteLength, IsEmail, IsString, IsUUID, Length, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @IsString() @Length(2, 120) name!: string;
  @IsEmail() @MaxLength(190) email!: string;
  @IsUUID() roleId!: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsString() @MinLength(8) @IsByteLength(8, 72) password?: string;
}
