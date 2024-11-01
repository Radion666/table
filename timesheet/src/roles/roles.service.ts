import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Roles } from './role.model';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Roles) private rolesRepository: typeof Roles) {}

  async create(createRoleDto: CreateRoleDto) {
    if (
      await this.rolesRepository.findOne({
        where: {
          name: createRoleDto.name,
        },
      })
    ) {
      throw new HttpException(
        'Такая роль уже существует',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.rolesRepository.create(createRoleDto);
  }

  findAll() {
    return this.rolesRepository.findAll({
      order: [['id', 'asc']],
    });
  }

  async findById(id: number): Promise<string> {
    if (!id) {
      throw new UnauthorizedException('Некорректные авторизационные данные');
    }
    const role = await this.rolesRepository.findByPk(id);
    return role?.name;
  }

  async findMasterId() {
    return await this?.rolesRepository?.findOne({
      where: {
        name: 'master',
      },
    });
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const [_, [updatedRole]] = await this.rolesRepository.update(
      updateRoleDto,
      {
        where: {
          id,
        },
        returning: true,
      },
    );
    return updatedRole;
  }

  async getAllRoleNamesExcludingWorker(): Promise<Roles[]> {
    const roles = await this.rolesRepository.findAll({
      where: {
        name: {
          [Op.notIn]: ['worker'],
        },
      },
    });

    return roles;
  }
}
