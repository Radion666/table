import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import dayjs from 'dayjs';
import { ChangeLog } from 'src/change_logs/change-logs.model';
import { ChangeLogsService } from 'src/change_logs/change-logs.service';
import { parseDate } from 'src/common/utils/date-utils';
import { Employee } from 'src/employee/employee.model';
import { Facilities } from 'src/facilities/facilities.model';
import { Roles } from 'src/roles/role.model';
import { User } from 'src/users/user.model';
import { createOrUpdateWorkLogsDto } from './dto/create-work_log.dto';
import { WorkDaysType } from './dto/types';
import { UpdateWorkLogDto } from './dto/update-work_log.dto';
import { WorkLog } from './work-logs.model';

@Injectable()
export class WorkLogsService {
  constructor(
    @InjectModel(WorkLog)
    private readonly workLogModel: typeof WorkLog,
    @InjectModel(ChangeLog)
    private readonly changeLogModel: typeof ChangeLog,
    @InjectModel(Employee)
    private readonly employeeModel: typeof Employee,
    @InjectModel(Facilities)
    private readonly facilitiesModel: typeof Facilities,
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(Roles)
    private readonly rolesModel: typeof Roles,
    private workLogChangesLogs: ChangeLogsService,
  ) {}

  async createOrUpdateWorkLogs(
    user: User,
    outterWorkLogs: createOrUpdateWorkLogsDto[],
  ) {
    let workLogs = outterWorkLogs;

    const foundUser = await this.userModel.findByPk(user.id);

    if (!foundUser) {
      throw new UnauthorizedException(
        'Не удалось идентфицировать пользователя',
      );
    }

    const foundUserRole = await this.rolesModel.findByPk(foundUser.role_id);

    if (!foundUserRole) {
      throw new UnauthorizedException(
        'Не удалось идентфицировать пользователя',
      );
    }

    if (foundUserRole.name === 'master') {
      const today = dayjs();

      const allowedDates = [
        today.format('YYYY-MM-DD'),
        today.subtract(1, 'day').format('YYYY-MM-DD'),
        today.subtract(2, 'day').format('YYYY-MM-DD'),
      ];

      workLogs = outterWorkLogs.map((el) => {
        const newDates = {};

        for (const dateKey in el.dates) {
          const value = el.dates[dateKey];

          const actualDay = dayjs(parseDate(dateKey));

          if (allowedDates.includes(actualDay.format('YYYY-MM-DD'))) {
            newDates[dateKey] = value;
          }
        }

        return {
          employeeId: el.employeeId,
          facilityId: el.facilityId,
          dates: newDates,
          total: el.total,
        };
      });
    }

    const errors: string[] = [];

    for (const logData of workLogs) {
      try {
        await this.validateWorkLogDates(
          logData.employeeId,
          logData.dates as any,
          logData.facilityId,
        );
      } catch (error) {
        errors.push(`${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new HttpException(
        `Validation errors occurred: ${errors.join('; ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const log of workLogs) {
      const { dates, employeeId, facilityId } = log;

      const dateOfFirstElement = Object.keys(dates)[0];
      const [_, month, year] = dateOfFirstElement.split('.').map(Number);

      const date = `${month}-${year}`;

      const newDates = {};

      for (const key in dates) {
        const date = dates[key];

        if (typeof date === 'string') {
          newDates[key] = date;
        } else if (typeof date === 'object') {
          if (!date?.day && !date?.night && !date?.overwork) {
            newDates[key] = null;
            continue;
          }
          newDates[key] = date;
        }
      }

      const existingLog = await this.workLogModel.findOne({
        where: { employeeId, date: date, facilityId },
      });

      const updatedWorkDays = existingLog ? { ...existingLog.workDays } : {};

      const changes = {};

      for (const [date, value] of Object.entries(newDates)) {
        console.log(date, value);
        if (!value) continue;
        updatedWorkDays[date] = value;

        if (existingLog) {
          const prevValue = existingLog?.workDays?.[date];
          const newValue = value;

          if (JSON.stringify(prevValue) !== JSON.stringify(newValue)) {
            changes[date] = {
              was: existingLog?.workDays?.[date] ?? null,
              became: value ?? null,
            };
          }
        } else {
          changes[date] = {
            was: null,
            became: value ?? null,
          };
        }
      }

      if (existingLog) {
        // console.log('im here', updatedWorkDays, existingLog);
        (
          await existingLog.update({
            workDays: { ...(updatedWorkDays as any) },
          })
        ).save();

        if (Object.keys(changes)?.length) {
          await this.workLogChangesLogs.create(
            existingLog.id,
            existingLog.workDays,
            updatedWorkDays,
            changes,
            foundUser.id,
            employeeId,
            facilityId,
            date,
          );
        }
      } else {
        const workLogs = await this.workLogModel.create({
          employeeId,
          date: date as any,
          workDays: updatedWorkDays as any,
          facilityId,
        });
        await this.workLogChangesLogs.create(
          workLogs.id,
          {},
          updatedWorkDays,
          changes,
          foundUser.id,
          employeeId,
          facilityId,
          date,
        );
      }
    }
    return 'success';
  }

  async validateWorkLogDates(
    employeeId: number,
    dates: Record<string, WorkDaysType>,
    facilityId: number,
  ): Promise<void> {
    if (!dates) {
      throw new Error('Не передан параметр dates');
    }
    const lenghOfDateKeys = Object.keys(dates)?.length;

    if (!lenghOfDateKeys) {
      throw new Error('Данные по датам пусты');
    }

    const employee = await this.employeeModel.findByPk(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    const facility = await this.facilitiesModel.findByPk(facilityId);
    if (!facility) {
      throw new Error(`Facility id ${facilityId} not found`);
    }

    // const firedAt = employee.firedAt;

    const regex = /^\d{2}\.\d{2}\.\d{4}$/;
    const allowdStringValues = ['Б', 'В', 'О', 'А'];

    for (const dateKey in dates) {
      const dateValue = dates[dateKey];

      if (!regex.test(dateKey)) {
        throw new Error(`Передан некорректный ключ даты ${dateKey}`);
      }

      if (
        typeof dateValue !== 'object' &&
        !allowdStringValues.includes(dateValue)
      ) {
        throw new Error(
          `Передан значение для поля = ${dateKey} - значение ${dateValue}`,
        );
      }
    }

    // if (firedAt) {
    //   const invalidDates = Object.keys(dates).filter((date) => {
    //     const value = dates[date];
    //     let valueToCompare: boolean | WorkDaysType = value;

    //     if (
    //       typeof value === 'object' &&
    //       !value?.day &&
    //       !value?.night &&
    //       !value?.overwork
    //     ) {
    //       valueToCompare = false;
    //     } else {
    //       valueToCompare = value;
    //     }

    //     return (
    //       !!valueToCompare && new Date(parseDate(date)) > new Date(firedAt)
    //     );
    //   });
    //   if (invalidDates.length > 0) {
    //     throw new Error(
    //       `Employee was fired on ${firedAt}, cannot log dates after this date: ${invalidDates.join(', ')}`,
    //     );
    //   }
    // }
  }

  async findByDate(date: string, facilityId: number) {
    const workLogs = await WorkLog.findAll({
      where: {
        date,
        facilityId,
      },
      attributes: {
        exclude: ['employeeId'],
      },

      include: [
        {
          model: Employee,
          attributes: ['id', 'lastName', 'firstName', 'middleName'],
        },
      ],
    });
    return workLogs;
  }

  findAll() {
    return `This action returns all workLogs`;
  }

  findOne(id: number) {}

  update(id: number, updateWorkLogDto: UpdateWorkLogDto) {
    return `This action updates a #${id} workLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} workLog`;
  }
}
