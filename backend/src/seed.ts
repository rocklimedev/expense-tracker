import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { DEFAULT_ROLE_PERMISSIONS } from './common/permissions';
import { Role } from './users/models/role.model';
import { User } from './users/models/user.model';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });

  let superAdminRole: Role | undefined;
  for (const [name, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const [role] = await Role.findOrCreate({ where: { name }, defaults: { name, permissions } });
    await role.update({ permissions }); // keeps defaults in sync on re-run
    if (name === 'SUPER_ADMIN') superAdminRole = role;
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? 'superadmin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  await User.findOrCreate({
    where: { email },
    defaults: {
      name: 'Super Admin',
      email,
      passwordHash: await bcrypt.hash(password, 10),
      roleId: superAdminRole.id,
    },
  });

  console.log(`Seeded roles and Super Admin (${email})`);
  await app.close();
}

seed();
