import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../users/models/role.model';
import { User } from '../users/models/user.model';
import { AuthUser } from '../common/types';
import { Permission } from '../common/permissions';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Permissions are read from the DB on every request, so role changes apply immediately
  async validate(payload: { sub: number }): Promise<AuthUser> {
    const user = await User.findByPk(payload.sub, { include: [Role] });
    if (!user || !user.isActive) throw new UnauthorizedException();

    return {
      id: user.id,
      name: user.name,
      role: user.role.name,
      permissions: user.role.permissions as Permission[],
    };
  }
}
