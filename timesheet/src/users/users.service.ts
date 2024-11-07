import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { hash } from 'bcryptjs';
import { Op } from 'sequelize';
import { MasterFacilities } from 'src/master_facilities/master-facilities.model';
import { Positions } from 'src/positions/positions.model';
import { Roles } from 'src/roles/role.model';
import { RolesService } from 'src/roles/roles.service';
import { UpdateUserDto } from './dto/updateUserDto';
import { CreateUserDto } from './dto/userDto';
import { User } from './user.model';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private userRepository: typeof User,
    private roleService: RolesService,
    @InjectModel(Positions) private positionModel: typeof Positions,
  ) {}

  async validateDto(dto: CreateUserDto, id?: number) {
    const findByPhone = await this.userRepository.findOne({
      where: {
        phoneNumber: dto.phoneNumber,
      },
    });

    if (findByPhone?.id && !id) {
      throw new HttpException(
        'Пользователь с таким номером телефона уже существует',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (findByPhone?.id && id && +findByPhone?.id !== +id) {
      throw new HttpException(
        'Пользователь с таким номером телефона уже существует',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isPositionExists = await this.positionModel.findByPk(dto.positionId);

    if (!isPositionExists && dto.positionId) {
      throw new HttpException(
        `Должности с id - ${dto.positionId} не найден`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const isRolesExists = await this.roleService.findById(dto.role_id);

    if ((dto.role_id && !isRolesExists) || dto.role_id === 0) {
      throw new HttpException(
        `Роль с id - ${dto.role_id} не найден`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createUser(dto: CreateUserDto) {
    await this.validateDto(dto);
    const user = await this.userRepository.create(dto);
    return user;
  }

  async updateUser(dto: UpdateUserDto, id?: number) {
    await this.validateDto(dto as CreateUserDto, id);

    if (dto?.password) {
      const hashPassword = await hash(dto.password, 5);
      const result = await this.userRepository.update(
        {
          ...dto,
          password: hashPassword,
          lastLoginAt: '2024-10-08 14:30:00' as any,
          passwordChangedAt: new Date(),
        },
        {
          where: {
            id: id,
          },
        },
      );

      if (result) {
        return 'Пользователь успешно обновлен';
      }
    }

    const result = await this.userRepository.update(
      {
        ...Object.fromEntries(
          Object.entries(dto).filter(([key, value]) => key !== 'password'),
        ),
        lastLoginAt: '2024-10-08 14:30:00' as any,
      },
      {
        where: {
          id: id,
        },
      },
    );

    if (result) {
      return 'Пользователь успешно обновлен';
    }
  }

  async getUser(login: string) {
    const user = await this.userRepository.findOne({
      where: {
        login,
      },
      include: [
        {
          all: true,
        },
        {
          model: Roles,
          attributes: ['id', 'name', 'alt_name'],
        },
      ],
    });
    return user;
  }

  async getUserRoleByPk(pk: number) {
    if (!pk) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }
    const user = await this.userRepository.findByPk(pk);
    if (!user) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }

    return user.role_id;
  }

  async getUserByPk(pk: number) {
    const user = await this.userRepository.findByPk(pk);

    if (!user) {
      throw new BadRequestException(`Пользователь с id = ${pk} не был найден `);
    }
    return user;
  }

  async getAllUser() {
    const users = await this.userRepository.findAll({
      include: {
        all: true,
      },
      attributes: {
        exclude: ['password'],
      },
    });
    return users;
  }

  async getEmployees(type?: string, facilityId?: number) {
    const allowedRoles =
      await this.roleService.getAllRoleNamesExcludingWorker();

    if (type) {
      const roleName = allowedRoles?.find((role) => role.name === type);

      if (!roleName) {
        return [];
      }

      return await this.userRepository.findAll({
        where: {
          role_id: {
            [Op.eq]: roleName.id,
          },
        },
        order: [['id', 'asc']],
        attributes: [
          'id',
          'login',
          'lastName',
          'firstName',
          'middleName',
          'phoneNumber',
        ],
        include: [
          {
            model: Positions,
            attributes: ['id', 'name'],
          },
          {
            model: Roles,
            attributes: ['id', 'name', 'alt_name'],
          },

          ...(facilityId
            ? [
                {
                  model: MasterFacilities,
                  where: { facility_id: facilityId },
                  attributes: [],
                  required: true,
                },
              ]
            : []),
        ],
      });
    }

    const employees = await this.userRepository.findAll({
      where: {
        role_id: {
          [Op.in]: allowedRoles.map((role) => role.id),
        },
      },
      order: [['id', 'asc']],
      attributes: [
        'id',
        'login',
        'lastName',
        'firstName',
        'middleName',
        'phoneNumber',
      ],
      include: [
        {
          model: Positions,
          attributes: ['id', 'name'],
        },
        {
          model: Roles,
          attributes: ['id', 'name', 'alt_name'],
        },
      ],
    });

    return employees;
  }

  async validateMastersById(id: number) {
    const masterRoleId = await this.roleService.findMasterId();
    const isFoundUser = await this.userRepository.findByPk(id);

    if (!isFoundUser) {
      throw new BadRequestException('Переданный мастер не найден');
    }

    if (isFoundUser?.role_id !== masterRoleId?.id) {
      throw new BadRequestException('Переданный мастер является некорректным');
    }
  }
}
