import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Cache } from 'cache-manager';
import dayjs from 'dayjs';
import { Op } from 'sequelize';
import { EMPLOYEES_CACHE_KEY } from 'src/common/utils/common';
import {
  EmploymentPeriod,
  EmploymentStatus,
} from 'src/employment-periods/employment-periods.model';
import { Facilities } from 'src/facilities/facilities.model';
import { FacilityPeriod } from 'src/facility-periods/facility-periods.model';
import { MasterPeriod } from 'src/master-periods/master-periods.model';
import { MasterFacilities } from 'src/master_facilities/master-facilities.model';
import { OutOfTownPeriod } from 'src/out-of-town-periods/out-of-town-periods';
import { PositionPeriod } from 'src/position-periods/position-periods.model';
import { Positions } from 'src/positions/positions.model';
import { Roles } from 'src/roles/role.model';
import { User } from 'src/users/user.model';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import {
  UpdateEmployeeDto,
  UpdateEmployeeDtoFromWorkLogs,
} from './dto/update-employee.dto';
import { Employee } from './employee.model';

@Injectable()
export class EmployeeService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Employee) private employeeModel: typeof Employee,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Facilities) private facilityModel: typeof Facilities,
    @InjectModel(Roles) private roleModel: typeof Roles,
    @InjectModel(Positions) private positionModel: typeof Positions,
    @InjectModel(EmploymentPeriod)
    private employmentPeriodModel: typeof EmploymentPeriod,
    @InjectModel(FacilityPeriod)
    private facilityPeriodModel: typeof FacilityPeriod,
    @InjectModel(MasterPeriod)
    private masterPeriodModel: typeof MasterPeriod,
    @InjectModel(OutOfTownPeriod)
    private outOfTownPeriodModel: typeof OutOfTownPeriod,
    @InjectModel(PositionPeriod)
    private positionPeriodModel: typeof PositionPeriod,
    @InjectModel(MasterFacilities)
    private masterFacilitiesModel: typeof MasterFacilities,
  ) {}

  async validateDto(createEmployeeDto: UpdateEmployeeDto, id?: number) {
    const findByPhone = await this.employeeModel.findOne({
      where: {
        phoneNumber: createEmployeeDto.phoneNumber,
      },
    });

    if (findByPhone?.id && !id) {
      throw new HttpException(
        'Пользователь с таким номером телефона уже существует',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (findByPhone?.id && id && findByPhone?.id !== id) {
      throw new HttpException(
        'Пользователь с таким номером телефона уже существует',
        HttpStatus.BAD_REQUEST,
      );
    }

    const position = await this.positionModel.findOne({
      where: { id: createEmployeeDto.positionId },
      include: [
        {
          model: Facilities,
          where: { id: createEmployeeDto.facilityId },
          through: { attributes: [] },
        },
      ],
    });

    if (!position) {
      throw new BadRequestException(
        'Переданная должность не связана с указанным объектом',
      );
    }

    const isPositionExists = await this.positionModel.findByPk(
      createEmployeeDto.positionId,
    );

    if (!isPositionExists && createEmployeeDto.positionId) {
      throw new HttpException(
        `Должности с id - ${createEmployeeDto.positionId} не найден`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const isFacilityExists = await this.facilityModel.findByPk(
      createEmployeeDto.facilityId,
    );

    if (!isFacilityExists && createEmployeeDto.facilityId) {
      throw new HttpException(
        `Объект с id - ${createEmployeeDto.facilityId} не найден`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const isRelatedMaster = await this.userModel.findByPk(
      createEmployeeDto.masterId,
    );

    if (!isRelatedMaster && createEmployeeDto.masterId) {
      throw new HttpException(
        `Привязанный пользователь с ролью мастер -  (id - ${createEmployeeDto.masterId}) не найден`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (isRelatedMaster) {
      const relatedMasterRoleName = await this.roleModel.findByPk(
        isRelatedMaster.role_id,
      );

      if (relatedMasterRoleName && relatedMasterRoleName.name !== 'master') {
        throw new HttpException(
          `Привязанный пользователь не обладает ролью "Мастер"`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const isMasterRelatedToFacility =
        await this.masterFacilitiesModel.findOne({
          where: {
            master_id: isRelatedMaster?.id,
            facility_id: isFacilityExists?.id,
          },
        });

      if (!isMasterRelatedToFacility) {
        throw new BadRequestException(
          'Мастер не относится к выбранному объекту',
        );
      }
    }
  }

  async create(createEmployeeDto: CreateEmployeeDto) {
    const isCreatedUsersExists = await this.userModel.findByPk(
      createEmployeeDto.createdById,
    );

    if (!isCreatedUsersExists) {
      throw new HttpException(
        `Созданный пользователь с id - ${createEmployeeDto.createdById} не найден`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.validateDto(createEmployeeDto);

    await this.cacheManager.del(EMPLOYEES_CACHE_KEY);

    const newEmployee = await this.employeeModel.create({
      ...createEmployeeDto,
      lastFacilityId: createEmployeeDto?.facilityId ?? null,
      lastIsOutOfTown: createEmployeeDto.isOutOfTown,
      lastMasterId: createEmployeeDto?.masterId ?? null,
      lastPositionId: createEmployeeDto?.positionId ?? null,
      lastStatus: createEmployeeDto?.status,
    });

    if (newEmployee) {
      await this.updateEmploymentPeriod(
        newEmployee.id,
        createEmployeeDto.status,
        createEmployeeDto.facilityId,
        createEmployeeDto.masterId,
        createEmployeeDto.positionId,
        createEmployeeDto.isOutOfTown,
      );
    }

    return newEmployee;
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto) {
    await this.validateDto(updateEmployeeDto, id);

    await this.cacheManager.del(EMPLOYEES_CACHE_KEY);

    const [_, [data]] = await this.employeeModel.update(
      {
        ...updateEmployeeDto,
        lastFacilityId: updateEmployeeDto?.facilityId ?? null,
        lastIsOutOfTown: updateEmployeeDto.isOutOfTown,
        lastMasterId: updateEmployeeDto?.masterId ?? null,
        lastPositionId: updateEmployeeDto?.positionId ?? null,
        lastStatus: updateEmployeeDto?.status,
      },
      {
        where: {
          id,
        },
        returning: true,
      },
    );

    await this.updateEmploymentPeriod(
      id,
      updateEmployeeDto.status,
      updateEmployeeDto.facilityId,
      updateEmployeeDto.masterId,
      updateEmployeeDto.positionId,
      updateEmployeeDto.isOutOfTown,
    );

    return data;
  }

  async updateFromLogs(
    id: number,
    updateEmployeeDto: UpdateEmployeeDtoFromWorkLogs,
  ) {
    console.log(id);
    // await this.validateDto(updateEmployeeDto, id);

    await this.cacheManager.del(EMPLOYEES_CACHE_KEY);

    const [_, [data]] = await this.employeeModel.update(
      {
        middleName: updateEmployeeDto.middleName,
        lastName: updateEmployeeDto.lastName,
        firstName: updateEmployeeDto.firstName,
        phoneNumber: updateEmployeeDto.phoneNumber,
        registeredAddress: updateEmployeeDto.registeredAddress,
        actualAddress: updateEmployeeDto.actualAddress,
        lastIsOutOfTown: updateEmployeeDto.isOutOfTown,
        lastPositionId: updateEmployeeDto?.positionId ?? null,
        lastStatus: updateEmployeeDto?.status,
      },
      {
        where: {
          id,
        },
        returning: true,
      },
    );

    await this.updateEmploymentPeriodFromWorkLogs(
      id,
      updateEmployeeDto.status,
      updateEmployeeDto.positionId,
      updateEmployeeDto.isOutOfTown,
    );

    return data;
  }

  private async updateEmploymentPeriodFromWorkLogs(
    employeeId: number,
    status: EmploymentStatus,
    positionId: number,
    isOutOfTown: boolean,
  ) {
    const currentPeriod = await this.employmentPeriodModel.findOne({
      where: {
        employeeId,
        endDate: null,
      },
    });

    const currentPosition = await this.positionPeriodModel.findOne({
      where: {
        employeeId,
        endDate: null,
      },
    });

    const currentIsOutOfTown = await this.outOfTownPeriodModel.findOne({
      where: {
        employeeId,
        endDate: null,
      },
    });

    if (
      currentIsOutOfTown ? currentIsOutOfTown.isOutOfTown !== isOutOfTown : true
    ) {
      if (currentIsOutOfTown) {
        currentIsOutOfTown.endDate = new Date();
        await currentIsOutOfTown.save();
      }

      await this.outOfTownPeriodModel.create({
        employeeId,
        startDate: new Date(),
        isOutOfTown,
      });
    }

    if (currentPosition ? currentPosition.positionId !== positionId : true) {
      if (currentPosition) {
        currentPosition.endDate = new Date();
        await currentPosition.save();
      }

      await this.positionPeriodModel.create({
        employeeId,
        startDate: new Date(),
        positionId,
      });
    }

    if (currentPeriod?.status ? currentPeriod.status !== status : true) {
      if (currentPeriod) {
        currentPeriod.endDate = new Date();
        await currentPeriod.save();
      }

      await this.employmentPeriodModel.create({
        employeeId,
        startDate: new Date(),
        status,
      });
    }
  }

  private async updateEmploymentPeriod(
    employeeId: number,
    status: EmploymentStatus,
    facilityId: number,
    masterId: number,
    positionId: number,
    isOutOfTown: boolean,
  ) {
    const currentPeriod = await this.employmentPeriodModel.findOne({
      where: {
        employeeId,
        endDate: null,
      },
    });

    const currentFacility = await this.facilityPeriodModel.findOne({
      where: {
        employeeId,
        endDate: null,
      },
    });

    const currentMaster = await this.masterPeriodModel.findOne({
      where: {
        employeeId,
        endDate: null,
      },
    });

    const currentPosition = await this.positionPeriodModel.findOne({
      where: {
        employeeId,
        endDate: null,
      },
    });

    const currentIsOutOfTown = await this.outOfTownPeriodModel.findOne({
      where: {
        employeeId,
        endDate: null,
      },
    });

    if (
      currentIsOutOfTown ? currentIsOutOfTown.isOutOfTown !== isOutOfTown : true
    ) {
      if (currentIsOutOfTown) {
        currentIsOutOfTown.endDate = new Date();
        await currentIsOutOfTown.save();
      }

      await this.outOfTownPeriodModel.create({
        employeeId,
        startDate: new Date(),
        isOutOfTown,
      });
    }

    if (currentPosition ? currentPosition.positionId !== positionId : true) {
      if (currentPosition) {
        currentPosition.endDate = new Date();
        await currentPosition.save();
      }

      await this.positionPeriodModel.create({
        employeeId,
        startDate: new Date(),
        positionId,
      });
    }

    if (currentMaster ? currentMaster.masterId !== masterId : true) {
      if (currentMaster) {
        currentMaster.endDate = new Date();
        await currentMaster.save();
      }

      await this.masterPeriodModel.create({
        employeeId,
        startDate: new Date(),
        masterId,
      });
    }

    if (currentFacility ? currentFacility.facilityId !== facilityId : true) {
      if (currentFacility) {
        currentFacility.endDate = new Date();
        await currentFacility.save();
      }

      await this.facilityPeriodModel.create({
        employeeId,
        startDate: new Date(),
        facilityId,
      });
    }

    if (currentPeriod?.status ? currentPeriod.status !== status : true) {
      if (currentPeriod) {
        currentPeriod.endDate = new Date();
        await currentPeriod.save();
      }

      await this.employmentPeriodModel.create({
        employeeId,
        startDate: new Date(),
        status,
      });
    }
  }

  async findAll(user: User, searchName?: string, status?: EmploymentStatus) {
    //TODO
    //Добавить проверку на user

    const whereConditions = {} as any;

    let employees: Employee[] = [];

    const isExistsOnCache: any =
      await this.cacheManager.get(EMPLOYEES_CACHE_KEY);

    if (isExistsOnCache?.[status] && !searchName) {
      employees = isExistsOnCache?.[status];
    } else {
      if (searchName) {
        const searchTerms = searchName
          .split(' ')
          .map((term) => term.trim())
          .filter(Boolean);
        whereConditions[Op.or] = searchTerms.map((term) => ({
          [Op.or]: [
            { lastName: { [Op.iLike]: `%${term}%` } },
            { firstName: { [Op.iLike]: `%${term}%` } },
            { middleName: { [Op.iLike]: `%${term}%` } },
          ],
        }));
      }

      if (status) {
        if (
          !Object.values(EmploymentStatus).includes(status as EmploymentStatus)
        ) {
          throw new BadRequestException('Был передан не существуюющий статус');
        }
        whereConditions.lastStatus = status;
      }

      const newEmployees = await this.employeeModel.findAll({
        ...((searchName || status) && {
          where: whereConditions,
        }),
        order: [['createdAt', 'ASC']],
        attributes: {
          exclude: [
            'lastFacilityId',
            'lastMasterId',
            'lastPositionId',
            'createdById',
          ],
        },
        include: [
          {
            model: Facilities,
            attributes: ['id', 'name'],
          },
          {
            model: Positions,
            attributes: ['id', 'name'],
          },
          {
            model: EmploymentPeriod,
            attributes: ['status', 'startDate', 'endDate', 'createdAt', 'id'],
          },
          {
            model: MasterPeriod,
            attributes: {
              exclude: ['masterId', 'employeeId'],
            },
            include: [
              {
                model: User,
                attributes: {
                  exclude: [
                    'positionId',
                    'role_id',
                    'password',
                    'login',
                    'lastLoginAt',
                    'createdAt',
                    'updatedAt',
                  ],
                },
                include: [
                  {
                    model: Roles,
                    attributes: {
                      exclude: ['id'],
                      include: ['name', 'alt_name', 'createdAt', 'updatedAt'],
                    },
                  },
                  {
                    model: Positions,
                    attributes: ['name'],
                  },
                ],
              },
            ],
          },
          {
            model: FacilityPeriod,
            attributes: {
              exclude: ['facilityId', 'employeeId'],
            },
            include: [
              {
                model: Facilities,
                attributes: ['name', 'id'],
              },
            ],
          },
          {
            model: PositionPeriod,
            attributes: {
              exclude: ['positionId', 'employeeId'],
            },
            include: [
              {
                model: Positions,
                attributes: ['name', 'id'],
              },
            ],
          },
          {
            model: OutOfTownPeriod,
            attributes: ['isOutOfTown', 'startDate', 'endDate', 'createdAt'],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'middleName'],
          },
          {
            model: User,
            as: 'lastMaster',
            attributes: ['id', 'firstName', 'lastName', 'middleName'],
          },
        ],
      });

      await this.cacheManager.set(
        EMPLOYEES_CACHE_KEY,
        {
          [status]: newEmployees,
        },
        0,
      );

      employees = newEmployees;
    }

    const userRole = await this.roleModel.findByPk(user?.role as any);

    const sortedEmployees = employees.map((employee) => {
      const sortedEmploymentPeriods =
        employee.employmentPeriods?.sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }) || [];
      const sortedMasterPeriods =
        employee.masterPeriods?.sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }) || [];
      const sortedPositionPeriods =
        employee.positionPeriods?.sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }) || [];
      const sortedOutOfTownPeriods =
        employee.outOfTownPeriods?.sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }) || [];
      const sortedFacilityPeriods =
        employee.facilityPeriods?.sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }) || [];

      return {
        ...employee.toJSON(),
        employmentPeriods: sortedEmploymentPeriods,
        masterPeriods: sortedMasterPeriods,
        positionPeriods: sortedPositionPeriods,
        outOfTownPeriods: sortedOutOfTownPeriods,
        facilityPeriods: sortedFacilityPeriods,
      };
    });

    if (userRole?.name === 'master') {
      const mastersEmployees: typeof sortedEmployees = [];

      for (let i = 0; i < sortedEmployees?.length; i++) {
        const firstMaster = sortedEmployees?.[i].masterPeriods?.[0];
        if (
          firstMaster?.endDate === null &&
          firstMaster?.['user']?.id === user.id
        )
          mastersEmployees.push({
            ...sortedEmployees?.[i],
            masterPeriods: [
              {
                ...(firstMaster.toJSON() as any),
              },
            ],
          });
      }

      return mastersEmployees;
    } else {
      return sortedEmployees;
    }
  }

  findOne(id: number) {}

  async findByFacilityId(facilityId: number, monthYear: string) {
    return this.getAllowedEmployeesByFacilityAndDate(facilityId, monthYear);
  }

  async getAllowedEmployeesByFacilityAndDate(
    facilityId: number,
    monthYear: string,
  ) {
    const isFacilityExists = await this.facilityModel.findByPk(facilityId);

    if (!isFacilityExists && facilityId) {
      throw new HttpException(
        `Объект с id - ${facilityId} не найден`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const [month, year] = monthYear.split('-').map(Number);
    const startDate = dayjs(new Date(year, month - 1, 1));
    const endDate = dayjs(new Date(year, month, 0));

    const facilities = await this.facilityPeriodModel.findAll({
      where: {
        facilityId: facilityId,
      },
    });

    const allowedFacilityEmployees: FacilityPeriod[] = [];
    for (let i = 0; i < facilities?.length; i++) {
      const facility = facilities?.[i];

      const innerStartDate = dayjs(facility?.startDate);

      const innerEndDate =
        facility?.endDate === null ? null : dayjs(facility?.endDate);

      if (
        innerEndDate === null &&
        (innerStartDate?.isBefore(startDate) ||
          innerStartDate?.isSame(startDate, 'month'))
      ) {
        allowedFacilityEmployees.push(facility);
        continue;
      } else if (
        innerEndDate !== null &&
        (innerStartDate.isBefore(startDate) ||
          innerStartDate?.isSame(startDate, 'month')) &&
        (innerEndDate.isAfter(endDate) ||
          innerEndDate?.isSame(endDate, 'month'))
      ) {
        allowedFacilityEmployees.push(facility);
        continue;
      }
    }

    const allEmployeesIds = allowedFacilityEmployees?.map(
      (el) => el.employeeId,
    );
    const employees = await this.employeeModel.findAll({
      where: {
        id: allEmployeesIds,
      },
      include: [
        {
          model: EmploymentPeriod,
          attributes: ['status', 'startDate', 'endDate', 'createdAt'],
        },
        {
          model: Positions,
          attributes: ['id', 'name'],
        },
      ],
    });

    const allowedEmployees: Employee[] = [];

    for (let i = 0; i < employees?.length; i++) {
      const employee = employees?.[i];

      const allowedPeriods: EmploymentPeriod[] = [];

      for (let j = 0; j < employee?.employmentPeriods?.length; j++) {
        const employmentPeriod = employee?.employmentPeriods?.[j];

        const innerStartDate = dayjs(employmentPeriod?.startDate);
        const innerEndDate =
          employmentPeriod?.endDate === null
            ? null
            : dayjs(employmentPeriod?.endDate);

        if (
          innerEndDate === null &&
          (innerStartDate?.isBefore(startDate) ||
            innerStartDate?.isSame(startDate, 'month'))
        ) {
          allowedPeriods.push(employmentPeriod);
          continue;
        } else if (
          innerEndDate !== null &&
          (innerStartDate.isBefore(startDate) ||
            innerStartDate?.isSame(startDate, 'month')) &&
          (innerEndDate.isAfter(endDate) ||
            innerEndDate?.isSame(endDate, 'month'))
        ) {
          allowedPeriods.push(employmentPeriod);
          continue;
        }
      }

      if (allowedPeriods?.length) {
        allowedEmployees.push({
          id: employee.id,
          lastName: employee?.lastName,
          firstName: employee?.firstName,
          middleName: employee?.middleName,
          registeredAddress: employee?.registeredAddress,
          phoneNumber: employee?.phoneNumber,
          lastStatus: employee?.lastStatus,
          position: {},
          employmentPeriods: allowedPeriods,
          facilityPeriods: allowedFacilityEmployees.filter(
            (emp) => emp.employeeId === employee.id,
          ),
          lastPosition: employee.lastPosition,
          lastIsOutOfTown: employee.lastIsOutOfTown,
        } as any);
      }
    }

    return allowedEmployees;
  }

  // remove(id: number) {
  //   return `This action removes a #${id} employee`;
  // }
}
