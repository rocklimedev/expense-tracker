import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Role } from './models/role.model';
import { User } from './models/user.model';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SequelizeModule.forFeature([User, Role])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [SequelizeModule],
})
export class UsersModule {}
