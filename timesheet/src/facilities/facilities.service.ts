import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import {
  transformDatesToMonthsArray,
  validateWorkDays,
} from 'src/common/utils/date-utils';
import { FacilityPeriod } from 'src/facility-periods/facility-periods.model';
import { MasterFacilities } from 'src/master_facilities/master-facilities.model';
import { ProductionCalendar } from 'src/production-calendar/production-calendar.model';
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
    @InjectModel(ProductionCalendar)
    private productionCalendar: typeof ProductionCalendar,
    // private masterFacilitiesService: MasterFacilitiesService,
  ) {}

  async create(createFacilityDto: CreateFacilityDto) {
    if (
      await this.facilitiesRepository.findOne({
        where: {
          name: createFacilityDto.name,
          settings: createFacilityDto.settings,
        },
      })
    ) {
      throw new HttpException(
        'Такой объект уже существует',
        HttpStatus.BAD_REQUEST,
      );
    }

    validateWorkDays(createFacilityDto?.workDays);

    const formattedData = transformDatesToMonthsArray(
      createFacilityDto?.notWorkingDays ?? [],
    );

    const createdFacility =
      await this.facilitiesRepository.create(createFacilityDto);

    await this.productionCalendar.create({
      facilityId: createdFacility.id,
      startDate: new Date(),
      endDate: null,
      workingDays: createFacilityDto.workDays ?? [],
      months: formattedData,
    });

    await this.setMasterFacilities(
      createdFacility?.id,
      createFacilityDto?.mastersIds,
    );

    return createdFacility;
  }

  async validateMastersById(id: number) {
    const masterRoleId = await this?.rolesRepositoryy?.findOne({
      where: {
        name: 'master',
      },
    });
    const isFoundUser = await this.userReposity.findByPk(id);

    if (!isFoundUser) {
      throw new BadRequestException('Переданный мастер не найден');
    }

    if (isFoundUser?.role_id !== masterRoleId?.id) {
      throw new BadRequestException('Переданный мастер является некорректным');
    }
  }

  async setMasterFacilities(facilityId: number, mastersIds: number[]) {
    if (mastersIds?.length) {
      for (let i = 0; i < mastersIds?.length; i++) {
        const master = mastersIds?.[i];
        await this.validateMastersById(master);
      }
    }
    await this.updateMasterFacility(facilityId, mastersIds ?? []);
  }

  async updateMasterFacility(id: number, mastersIds: number[]) {
    if (!id) {
      throw new HttpException(
        'ID объекта не был передан',
        HttpStatus.BAD_REQUEST,
      );
    }

    const currentFacility = await this.masterFacilitiesRepository.findOne({
      where: {
        facility_id: id,
      },
    });

    if (Array.isArray(mastersIds) && mastersIds?.length === 0) {
      if (currentFacility) {
        return this?.masterFacilitiesRepository?.destroy({
          where: {
            facility_id: id,
          },
        });
      }

      return;
    }

    if (!currentFacility) {
      const newRelations = mastersIds.map((master_id) => ({
        facility_id: id,
        master_id,
      }));

      return await this.masterFacilitiesRepository.bulkCreate(newRelations);
    }

    await this.findOne(id);

    const existingRelations = await this.masterFacilitiesRepository.findAll({
      where: { facility_id: id },
    });

    const existingMasterIds = existingRelations.map(
      (relation) => relation.master_id,
    );

    const mastersToUpdate = mastersIds;

    const mastersToAdd = mastersToUpdate.filter(
      (id) => !existingMasterIds.includes(id),
    );

    const mastersToRemove = existingMasterIds.filter(
      (id) => !mastersToUpdate.includes(id),
    );

    for (const master_id of mastersToUpdate) {
      await this.masterFacilitiesRepository.update(
        { master_id },
        {
          where: {
            facility_id: id,
            master_id: master_id,
          },
          returning: true,
        },
      );
    }

    if (mastersToAdd.length > 0) {
      const newRelations = mastersToAdd.map((master_id) => ({
        master_id,
        facility_id: id,
      }));

      await this.masterFacilitiesRepository.bulkCreate(newRelations);
    }

    if (mastersToRemove.length > 0) {
      await this.masterFacilitiesRepository.destroy({
        where: {
          master_id: { [Op.in]: mastersToRemove },
          facility_id: id,
        },
      });
    }
    const updatedRelations = await this.masterFacilitiesRepository.findAll({
      where: { facility_id: id },
    });
    return updatedRelations;
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
          include: [
            {
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
            {
              model: ProductionCalendar,
              order: ['createdAt', 'DESC'],
            },
          ],
        });

      const totalPage = Math.ceil(totalItems / pageSize);

      const sortedItems = items?.map((item) => {
        const sortedProductionCalendar =
          item.productionCalendar?.sort((a, b) => {
            return b.createdAt.getTime() - a.createdAt.getTime();
          }) || [];

        return {
          ...item?.toJSON(),
          productionCalendar: sortedProductionCalendar,
        };
      });

      return {
        items: sortedItems as any,
        currentPage: +page,
        totalPage: +totalPage,
        pageSize: +pageSize,
        totalItems: +totalItems,
      };
    }
  }

  async findOne(id: number, year?: number, month?: number) {
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
      include: {
        model: ProductionCalendar,
        where: year
          ? {
              months: {
                [Op.contains]: { year: year },
              },
            }
          : undefined,
      },
    });

    if (!foundFacility) {
      return await this.facilitiesRepository.findOne({
        where: {
          id,
        },
      });
    }

    if (year && month) {
      if (foundFacility && foundFacility.productionCalendar) {
        foundFacility.productionCalendar =
          foundFacility.productionCalendar.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
      }

      const jsonedFacility = foundFacility.toJSON();

      let newFoundFacility = {};

      const newProductionCalendar: [] = [];

      for (let i = 0; i < jsonedFacility.productionCalendar?.length; i++) {
        const element = jsonedFacility?.productionCalendar?.[i];

        let newMonths = {};

        for (let j = 0; j < element?.months?.dates?.length; j++) {
          const date = element?.months?.dates?.[j];

          if (date.month === month) {
            newMonths = {
              ...date,
            };
          }
        }
        //@ts-ignore
        newProductionCalendar.push({
          ...element,
          months: newMonths,
        });

        // newProductionCalendar.push({
        //   ...element,
        // });
      }

      newFoundFacility = {
        ...jsonedFacility,
        productionCalendar: newProductionCalendar,
      };

      return newFoundFacility;
    }

    return foundFacility;
  }

  async update(id: number, updateFacilityDto: UpdateFacilityDto) {
    await this.findOne(id);

    const foundFacility = await this.facilitiesRepository.findOne({
      where: {
        name: updateFacilityDto.name,
      },
    });

    if (foundFacility && foundFacility?.id !== id) {
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

    const currentProductionCalendar = await this.productionCalendar.findOne({
      where: {
        facilityId: id,
        endDate: null,
      },
    });

    validateWorkDays(updateFacilityDto?.workDays);

    const formattedData = transformDatesToMonthsArray(
      updateFacilityDto?.notWorkingDays?.length
        ? updateFacilityDto?.notWorkingDays
        : [],
    );

    if (
      currentProductionCalendar &&
      (JSON.stringify(currentProductionCalendar?.workingDays) !==
        JSON.stringify(updateFacilityDto?.workDays) ||
        JSON.stringify(formattedData) !==
          JSON.stringify(currentProductionCalendar?.months))
    ) {
      if (currentProductionCalendar) {
        currentProductionCalendar.endDate = new Date();
        await currentProductionCalendar.save();
      }

      await this.productionCalendar.create({
        facilityId: id,
        startDate: new Date(),
        endDate: null,
        workingDays: updateFacilityDto.workDays ?? [],
        months: formattedData,
      });
    } else if (!currentProductionCalendar) {
      await this.productionCalendar.create({
        facilityId: id,
        startDate: new Date(),
        endDate: null,
        workingDays: updateFacilityDto.workDays ?? [],
        months: formattedData,
      });
    }

    await this.updateMasterFacility(
      updatedFacilitiy.id,
      updateFacilityDto.mastersIds ?? [],
    );

    return updatedFacilitiy;
  }

  async remove(facilityId: number) {
    try {
      const employee = await this.facilitiesRepository.findByPk(facilityId, {
        include: [MasterFacilities, ProductionCalendar, FacilityPeriod],
      });

      if (!employee) {
        throw new BadRequestException('Объект не найден');
      }

      await Promise.all([
        MasterFacilities.destroy({
          where: {
            facility_id: facilityId,
          },
        }),
        FacilityPeriod.destroy({ where: { facilityId } }),
        ProductionCalendar.destroy({ where: { facilityId } }),
      ]);

      await employee.destroy();
    } catch (error) {
      console.error(`Error removing employee with ID ${facilityId}:`, error);
      throw new Error('Error removing employee');
    }
  }
}
