import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UniqueConstraintError } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AuthUser } from '../common/types';
import { Role } from '../rbac/models/role.model';
import { RbacService } from '../rbac/rbac.service';
import { User } from './models/user.model';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
      attributes: { exclude: ['passwordHash', 'passwordVersion'] },
      include: [{ model: Role, attributes: ['id', 'name'] }],
    });
  }

  listExpenseRequesters() {
    return User.findAll({
      attributes: ['id', 'name'],
      where: { isActive: true },
      order: [['name', 'ASC'], ['id', 'ASC']],
    });
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const passwordHash = dto.password === undefined ? undefined : await bcrypt.hash(dto.password, 10);
    try {
      await this.sequelize.transaction(async (transaction) => {
        const user = await User.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!user?.isActive) throw new NotFoundException('Active user not found');
        if (id === actor.id && dto.roleId !== user.roleId) {
          throw new ForbiddenException('You cannot change your own role');
        }
        await this.rbac.checkRoleAssignment(user.roleId, actor, transaction);
        if (dto.roleId !== user.roleId) {
          await this.rbac.checkRoleAssignment(dto.roleId, actor, transaction);
        }
        await user.update({
          name: dto.name,
          email: dto.email,
          roleId: dto.roleId,
          ...(passwordHash === undefined ? {} : { passwordHash, passwordVersion: user.passwordVersion + 1 }),
        }, { transaction });
      });
      return this.sanitize(id);
    } catch (error) {
      if (error instanceof UniqueConstraintError)
        throw new ConflictException('Email already in use');
      throw error;
    }
  }

  async resetPassword(id: string, password: string, actor: AuthUser) {
    const passwordHash = await bcrypt.hash(password, 10);
    await this.sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user?.isActive) throw new NotFoundException('Active user not found');
      await this.rbac.checkRoleAssignment(user.roleId, actor, transaction);
      await user.update({ passwordHash, passwordVersion: user.passwordVersion + 1 }, { transaction });
    });
    return { reset: true };
  }

  async remove(id: string, actor: AuthUser) {
    if (id === actor.id) throw new ForbiddenException('You cannot delete your own account');
    await this.sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) throw new NotFoundException('User not found');
      await this.rbac.checkRoleAssignment(user.roleId, actor, transaction);
      // Expenses and audit history retain their references to this account.
      if (user.isActive) await user.update({ isActive: false }, { transaction });
    });
    return { deleted: true };
  }

  private sanitize(id: string) {
    return User.findByPk(id, {
      attributes: { exclude: ['passwordHash', 'passwordVersion'] },
      include: [Role],
    });
  }
}
