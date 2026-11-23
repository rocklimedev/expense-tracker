import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../rbac/models/role.model';
import { User } from '../users/models/user.model';

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await User.findOne({ where: { email }, include: [Role] });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role.name },
    };
  }
}
