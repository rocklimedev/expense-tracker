import { IsEmail, IsUUID, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsUUID() roleId!: string;
}
