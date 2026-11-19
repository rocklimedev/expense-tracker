import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEmail, IsString } from 'class-validator';
import { AuthUser } from '../common/types';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() request: { user: AuthUser }): AuthUser {
    return request.user;
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
