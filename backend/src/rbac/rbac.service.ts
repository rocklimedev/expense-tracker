import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ForeignKeyConstraintError, Op, Transaction, UniqueConstraintError } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Permissions } from '../common/permissions';
import { AuthUser } from '../common/types';
import { User } from '../users/models/user.model';
import { RbacPermission } from './models/permission.model';
import { RolePermission } from './models/role-permission.model';
import { Role } from './models/role.model';

@Injectable()
export class RbacService implements OnModuleInit {
  constructor(private readonly sequelize: Sequelize) {}

  async onModuleInit() {
    // Register application capabilities without changing any role grants.
    await RbacPermission.bulkCreate(
      Object.values(Permissions).map((code) => ({ code })),
      { ignoreDuplicates: true },
    );
  }

  async listAssignableRoles(actor: AuthUser) {
    const restricted = actor.permissions.includes(Permissions.ROLE_MANAGE)
      ? []
      : await RolePermission.findAll({
          where: { permissionCode: Permissions.ROLE_MANAGE },
          attributes: ['roleId'],
        });
    return Role.findAll({
      attributes: ['id', 'name'],
      where: restricted.length
        ? { id: { [Op.notIn]: restricted.map(({ roleId }) => roleId) } }
        : undefined,
      order: [['name', 'ASC']],
    });
  }

  async getRolePermissions(roleId: string, transaction?: Transaction) {
    const grants = await RolePermission.findAll({
      where: { roleId },
      attributes: ['permissionCode'],
      transaction,
    });
    return grants.map(({ permissionCode }) => permissionCode);
  }

  async getMatrix() {
    return this.sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      async (transaction) => {
        const roles = await Role.findAll({
          attributes: ['id', 'name'],
          order: [['name', 'ASC']],
          transaction,
        });
        const permissions = await RbacPermission.findAll({ order: [['code', 'ASC']], transaction });
        const grants = await RolePermission.findAll({ transaction });
        const grantsByRole = new Map<string, string[]>(roles.map(({ id }) => [id, []]));
        for (const grant of grants) grantsByRole.get(grant.roleId)?.push(grant.permissionCode);

        return {
          permissions: permissions.map(({ code }) => code),
          roles: roles.map(({ id, name }) => ({
            id,
            name,
            permissions: grantsByRole.get(id) ?? [],
          })),
        };
      },
    );
  }

  async createRole(name: string, actor: AuthUser) {
    try {
      return await this.sequelize.transaction(async (transaction) => {
        await this.requireRoleManager(actor, transaction);
        const { id } = await Role.create({ name }, { transaction });
        return { id, name, permissions: [] };
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError)
        throw new ConflictException('Role name already exists');
      throw error;
    }
  }

  async renameRole(roleId: string, name: string, actor: AuthUser) {
    try {
      await this.sequelize.transaction(async (transaction) => {
        await this.requireRoleManager(actor, transaction);
        const role = await Role.findByPk(roleId, { transaction });
        if (!role) throw new NotFoundException('Role not found');
        await role.update({ name }, { transaction });
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError)
        throw new ConflictException('Role name already exists');
      throw error;
    }
  }

  async deleteRole(roleId: string, actor: AuthUser) {
    const assignedMessage = 'This role is assigned to a user account and cannot be deleted.';
    try {
      await this.sequelize.transaction(async (transaction) => {
        await this.requireRoleManager(actor, transaction);
        if (roleId === actor.roleId) {
          throw new BadRequestException('You cannot delete your own role');
        }
        const role = await Role.findByPk(roleId, { transaction });
        if (!role) throw new NotFoundException('Role not found');
        if (await User.findOne({ attributes: ['id'], where: { roleId }, transaction })) {
          throw new ConflictException(assignedMessage);
        }
        await RolePermission.destroy({ where: { roleId }, transaction });
        await role.destroy({ transaction });
      });
    } catch (error) {
      if (error instanceof ForeignKeyConstraintError) throw new ConflictException(assignedMessage);
      throw error;
    }
  }

  async setGrant(roleId: string, code: string, granted: boolean, actor: AuthUser) {
    await this.sequelize.transaction(async (transaction) => {
      await this.requireRoleManager(actor, transaction);
      if (!(await Role.findByPk(roleId, { transaction })))
        throw new NotFoundException('Role not found');
      if (!(await RbacPermission.findByPk(code, { transaction })))
        throw new NotFoundException('Permission not found');
      if (!granted && roleId === actor.roleId && code === Permissions.ROLE_MANAGE) {
        throw new BadRequestException('You cannot remove role management from your own role');
      }

      const where = { roleId, permissionCode: code };
      if (granted) {
        await RolePermission.findOrCreate({ where, transaction });
      } else {
        await RolePermission.destroy({ where, transaction });
      }
    });
  }

  async checkRoleAssignment(roleId: string, actor: AuthUser, transaction: Transaction) {
    await this.lockGrants(transaction);
    if (!(await Role.findByPk(roleId, { transaction })))
      throw new BadRequestException('Role not found');

    const actorGrants = await this.getRolePermissions(actor.roleId, transaction);
    if (!actorGrants.includes(Permissions.USER_MANAGE)) throw new ForbiddenException();

    const targetGrants = await this.getRolePermissions(roleId, transaction);
    if (
      targetGrants.includes(Permissions.ROLE_MANAGE) &&
      !actorGrants.includes(Permissions.ROLE_MANAGE)
    ) {
      throw new ForbiddenException(
        'Only role managers can assign a role with role management access',
      );
    }
  }

  private async requireRoleManager(actor: AuthUser, transaction: Transaction) {
    await this.lockGrants(transaction);
    const grants = await this.getRolePermissions(actor.roleId, transaction);
    if (!grants.includes(Permissions.ROLE_MANAGE)) throw new ForbiddenException();
  }

  private async lockGrants(transaction: Transaction) {
    // Serialize grant edits and role assignments so their authorization checks use current grants.
    await RbacPermission.findByPk(Permissions.ROLE_MANAGE, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }
}
