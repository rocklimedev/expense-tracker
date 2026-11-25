import { IsEmail, IsString, IsUUID, Length, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @IsString() @Length(2, 120) name!: string;
  @IsEmail() @MaxLength(190) email!: string;
  @IsUUID() roleId!: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsString() @MinLength(8) @MaxLength(72) password?: string;
}
