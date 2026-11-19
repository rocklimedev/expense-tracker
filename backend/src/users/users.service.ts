import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from './models/role.model';
import { User } from './models/user.model';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  async create(dto: CreateUserDto) {
    const exists = await User.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await User.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      roleId: dto.roleId,
    });
    return this.sanitize(user.id);
  }

  findAll() {
    return User.findAll({
      attributes: { exclude: ['passwordHash'] },
      include: [{ model: Role, attributes: ['id', 'name'] }],
    });
  }

  private sanitize(id: number) {
    return User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
      include: [Role],
    });
  }
}
