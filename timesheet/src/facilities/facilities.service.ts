import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { MasterFacilities } from 'src/master_facilities/master-facilities.model';
import { Roles } from 'src/roles/role.model';
import { User } from 'src/users/user.model';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { Facilities } from './facilities.model';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectModel(Facilities) private facilitiesRepository: typeof Facilities,
    @InjectModel(MasterFacilities)
    private masterFacilitiesRepository: typeof MasterFacilities,
    @InjectModel(Roles) private rolesRepositoryy: typeof Roles,
    @InjectModel(User) private userReposity: typeof User,
  ) {}

  async create(createFacilityDto: CreateFacilityDto) {
    if (
      await this.facilitiesRepository.findOne({
        where: {
          name: createFacilityDto.name,
        },
      })
    ) {
      throw new HttpException(
        'Такой объект уже существует',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.facilitiesRepository.create(createFacilityDto);
  }

  async findAll(user: User, page: number, pageSize: number) {
    const foundUser = await this.userReposity.findOne({
      where: {
        id: user.id,
      },
    });

    if (!foundUser) {
      throw new BadRequestException('Пользователь не найен');
    }

    const isMaster = await this.rolesRepositoryy.findOne({
      where: {
        id: foundUser.role_id,
      },
    });

    const offset = (page - 1) * pageSize;

    if (isMaster.name === 'master') {
      const allowedFacilities = await this.masterFacilitiesRepository.findAll({
        where: {
          master_id: foundUser.id,
        },
      });
      const facilityIds = allowedFacilities.map((el) => el.facility_id);

      const { rows: items, count: totalItems } =
        await this.facilitiesRepository.findAndCountAll({
          offset,
          limit: pageSize,
          order: [['id', 'asc']],
          where: {
            id: facilityIds,
          },
          include: {
            model: MasterFacilities,
            attributes: ['master_id'],
            include: [
              {
                model: User,
                attributes: [
                  'lastName',
                  'firstName',
                  'middleName',
                  'phoneNumber',
                ],
              },
            ],
          },
        });
      const totalPage = Math.ceil(totalItems / pageSize);

      return {
        items,
        currentPage: +page,
        totalPage: +totalPage,
        pageSize: +pageSize,
        totalItems: +totalItems,
      };
    } else {
      const { rows: items, count: totalItems } =
        await this.facilitiesRepository.findAndCountAll({
          offset,
          limit: pageSize,
          order: [['id', 'asc']],
          include: {
            model: MasterFacilities,
            attributes: ['master_id'],
            include: [
              {
                model: User,
                attributes: [
                  'lastName',
                  'firstName',
                  'middleName',
                  'phoneNumber',
                ],
              },
            ],
          },
        });

      const totalPage = Math.ceil(totalItems / pageSize);

      return {
        items,
        currentPage: +page,
        totalPage: +totalPage,
        pageSize: +pageSize,
        totalItems: +totalItems,
      };
    }
  }

  async findOne(id: number) {
    if (!id) {
      throw new HttpException(
        'Объект с таким id не был передан',
        HttpStatus.BAD_REQUEST,
      );
    }
    const foundFacility = await this.facilitiesRepository.findOne({
      where: {
        id,
      },
    });
    if (!foundFacility) {
      throw new HttpException(
        'Объект с таким id не был найден',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async update(id: number, updateFacilityDto: UpdateFacilityDto) {
    await this.findOne(id);

    if (
      await this.facilitiesRepository.findOne({
        where: {
          name: updateFacilityDto.name,
        },
      })
    ) {
      throw new HttpException(
        'Объект с таким наименованием уже существует',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [_, [updatedFacilitiy]] = await this.facilitiesRepository.update(
      updateFacilityDto,
      {
        where: {
          id,
        },
        returning: true,
      },
    );
    return updatedFacilitiy;
  }
}
