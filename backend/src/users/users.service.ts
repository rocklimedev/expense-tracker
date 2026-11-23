import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UniqueConstraintError } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AuthUser } from '../common/types';
import { Role } from '../rbac/models/role.model';
import { RbacService } from '../rbac/rbac.service';
import { User } from './models/user.model';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly rbac: RbacService,
  ) {}

  async create(dto: CreateUserDto, actor: AuthUser) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.sequelize.transaction(async (transaction) => {
        await this.rbac.checkRoleAssignment(dto.roleId, actor, transaction);
        return User.create(
          {
            name: dto.name,
            email: dto.email,
            passwordHash,
            roleId: dto.roleId,
          },
          { transaction },
        );
      });
      return this.sanitize(user.id);
    } catch (error) {
      if (error instanceof UniqueConstraintError)
        throw new ConflictException('Email already in use');
      throw error;
    }
  }

  findAll() {
    return User.findAll({
      attributes: { exclude: ['passwordHash'] },
      include: [{ model: Role, attributes: ['id', 'name'] }],
    });
  }

  private sanitize(id: string) {
    return User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
      include: [Role],
    });
  }
}
