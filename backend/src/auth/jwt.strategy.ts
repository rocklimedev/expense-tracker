import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { isUUID } from 'class-validator';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../rbac/models/role.model';
import { User } from '../users/models/user.model';
import { AuthUser } from '../common/types';
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly rbac: RbacService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Permissions are read from the DB on every request, so role changes apply immediately
  async validate(payload: { sub?: unknown; passwordVersion?: unknown }): Promise<AuthUser> {
    if (typeof payload.sub !== 'string' || !isUUID(payload.sub)) throw new UnauthorizedException();

    const user = await User.findByPk(payload.sub, { include: [Role] });
    if (!user || !user.isActive) throw new UnauthorizedException();
    if (user.passwordVersion !== (payload.passwordVersion ?? 0)) throw new UnauthorizedException();

    return {
      id: user.id,
      name: user.name,
      role: user.role.name,
      roleId: user.roleId,
      permissions: await this.rbac.getRolePermissions(user.roleId),
    };
  }
}
