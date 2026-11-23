import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RbacModule } from '../rbac/rbac.module';
import { User } from './models/user.model';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [RbacModule, SequelizeModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [SequelizeModule],
})
export class UsersModule {}
