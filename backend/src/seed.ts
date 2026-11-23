import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { Sequelize } from 'sequelize-typescript';
import { AppModule } from './app.module';
import { RolePermission } from './rbac/models/role-permission.model';
import { Role } from './rbac/models/role.model';
import { DEFAULT_ROLE_PERMISSIONS } from './rbac/default-role-permissions';
import { User } from './users/models/user.model';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });

  try {
    const email = process.env.SEED_ADMIN_EMAIL ?? 'superadmin@example.com';
    const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
    const passwordHash = await bcrypt.hash(password, 10);
    await app.get(Sequelize).transaction(async (transaction) => {
      for (const [name, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
        const [role, created] = await Role.findOrCreate({ where: { name }, transaction });
        if (created) {
          await RolePermission.bulkCreate(
            permissions.map((permissionCode) => ({ roleId: role.id, permissionCode })),
            { transaction },
          );
        }
      }

      const superAdminRole = await Role.findOne({
        where: { name: 'SUPER_ADMIN' },
        transaction,
        rejectOnEmpty: true,
      });
      await User.findOrCreate({
        where: { email },
        defaults: { name: 'Super Admin', email, passwordHash, roleId: superAdminRole.id },
        transaction,
      });
    });
    console.log(`Seeded roles and Super Admin (${email})`);
  } finally {
    await app.close();
  }
}

seed();
