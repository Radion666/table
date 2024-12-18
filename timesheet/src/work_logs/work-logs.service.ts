import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  StreamableFile,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import dayjs from 'dayjs';
import { ChangeLog } from 'src/change_logs/change-logs.model';
import { ChangeLogsService } from 'src/change_logs/change-logs.service';
import {
  cleanData,
  isValidDateFormat,
  parseDate,
  validateParamsDate,
} from 'src/common/utils/date-utils';
import { Employee } from 'src/employee/employee.model';
import { Facilities } from 'src/facilities/facilities.model';
import { Roles } from 'src/roles/role.model';
import { User } from 'src/users/user.model';
import { createOrUpdateWorkLogsDto } from './dto/create-work_log.dto';
import { WorkDaysType } from './dto/types';
import { UpdateWorkLogDto } from './dto/update-work_log.dto';
import { WorkLog } from './work-logs.model';

import { Workbook } from 'exceljs';
import { Op } from 'sequelize';
import { cellValueType } from 'src/common/types/types';
import {
  checkDateForSheetValidation,
  getShortUserFio,
  workerStatuses,
} from 'src/common/utils/common';
import { getDaysInMonth } from 'src/common/utils/date-utils';
import {
  applyAlignment,
  dateRegex,
  getExcelColumnName,
  incrementColumn,
  setSumWithStep,
} from 'src/common/utils/excel-utils';
import { EmployeeService } from 'src/employee/employee.service';
import { worksheetTableFacilitySettingIntegersType } from 'src/facilities/dto/create-facility.dto';
import { MasterFacilities } from 'src/master_facilities/master-facilities.model';
import { ProductionCalendar } from 'src/production-calendar/production-calendar.model';
import { PassThrough } from 'stream';

export type lettersSumType = {
  Я: number;
  П: number;
  Б: number;
  В: number;
  О: number;
  МО: number;
  А: number;
  К: number;
  М: number;
};

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
    private employeeService: EmployeeService,
  ) {}

  async createOrUpdateWorkLogs(
    user: User,
    outterWorkLogs: createOrUpdateWorkLogsDto[],
  ) {
    try {
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

      const dateOfFirstElement = Object.keys(workLogs?.[0]?.dates)[0];
      const [_, month, year] = dateOfFirstElement.split('.').map(Number);
      const date = `${month}-${year}`;

      if (!isValidDateFormat(date)) {
        throw new BadRequestException(
          'Переданная в параметрах дата имеет некорректный формат',
        );
      }

      const facilityId = workLogs?.[0]?.facilityId;

      const facilitySettings = await this.facilitiesModel.findByPk(facilityId);
      const integers = facilitySettings?.settings?.integers;

      const isTotalInteger = integers?.allowOnlyTotal;

      const allowedEmployees = await this.employeeService.findByFacilityId(
        facilityId,
        date,
      );

      for (const logData of workLogs) {
        try {
          await this.validateWorkLogDates(
            logData.employeeId,
            logData.dates as any,
            logData.facilityId,
            allowedEmployees,
            integers,
          );
        } catch (error) {
          errors.push(`${error.message}`);
        }
      }

      if (errors.length > 0) {
        throw new HttpException(
          `Ошибка валидации данных: ${errors.join('; ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      for (const log of workLogs) {
        const { dates, employeeId, facilityId } = log;

        const dateOfFirstElement = Object.keys(dates)[0];
        const [_, month, year] = dateOfFirstElement.split('.').map(Number);

        const date = `${month}-${year}`;

        const newDatesCopy = {};

        for (const key in dates) {
          const date = dates[key];

          if (typeof date === 'string') {
            newDatesCopy[key] = date;
          } else if (typeof date === 'object') {
            if (
              isTotalInteger
                ? !date?.total
                : (integers?.allowDay &&
                    integers?.allowNight &&
                    integers?.allowOverwork &&
                    !date?.day &&
                    !date?.night &&
                    !date?.overwork) ||
                  (integers?.allowDay &&
                    integers?.allowNight &&
                    !date?.day &&
                    !date?.night) ||
                  (integers?.allowDay &&
                    integers?.allowOverwork &&
                    !date?.day &&
                    !date?.overwork) ||
                  (integers?.allowNight &&
                    integers?.allowOverwork &&
                    !date?.night &&
                    !date?.overwork) ||
                  (integers?.allowDay && !date?.day) ||
                  (integers?.allowNight && !date?.night) ||
                  (integers?.allowOverwork && !date?.overwork)
            ) {
              newDatesCopy[key] = null;
              continue;
            }
            newDatesCopy[key] = date;
          }
        }

        const newDates = cleanData(dates, integers);

        const existingLog = await this.workLogModel.findOne({
          where: { employeeId, date: date, facilityId },
        });

        const updatedWorkDays = existingLog ? { ...existingLog.workDays } : {};

        const changes = {};

        for (const [date, value] of Object.entries(newDates)) {
          const prevValue = existingLog?.workDays?.[date];
          const newValue = value;

          if (!value && !prevValue) continue;

          updatedWorkDays[date] = value;

          if (existingLog) {
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
    } catch (err: any) {
      throw new BadRequestException('Неизвестная ошибка', err);
    }
  }

  async validateWorkLogDates(
    employeeId: number,
    dates: WorkDaysType,
    facilityId: number,
    allowedEmployees: Employee[],
    integers: worksheetTableFacilitySettingIntegersType,
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
    const employeeShortName = getShortUserFio(employee);

    const facility = await this.facilitiesModel.findByPk(facilityId);
    if (!facility) {
      throw new Error(`Facility id ${facilityId} not found`);
    }

    // const firedAt = employee.firedAt;

    const regex = /^\d{2}\.\d{2}\.\d{4}$/;
    const allowdStringValues = ['Б', 'В', 'О', 'А', 'П', 'МО', 'К', 'М'];

    for (const dateKey in dates) {
      const dateValue = dates[dateKey];

      const currentDay = dayjs(dateKey, 'DD.MM.YYYY').day();
      const isWeekend = currentDay === 6 || currentDay === 0;

      if (!regex.test(dateKey)) {
        throw new Error(`Передан некорректный ключ даты ${dateKey}`);
      }

      if (
        typeof dateValue !== 'object' &&
        !allowdStringValues.includes(dateValue)
      ) {
        throw new Error(
          `Переданное сотрудника ${employeeShortName} для даты ${dateKey} - некорректно, значение ${dateValue}`,
        );
      }

      if (typeof dateValue === 'object') {
        const day = dateValue?.day || 0;
        const night = dateValue?.night || 0;
        const overwork = dateValue?.overwork || 0;
        const total = dateValue?.total || 0;

        if (integers?.allowOnlyTotal) {
          if (day || night || overwork) {
            throw new Error(
              `В этой настройке табеля запрещено заполнять день, ночь или переработки`,
            );
          }
          if (total > 24) {
            throw new Error(
              `Суммарное значение ячейки не может превышать 24 часа`,
            );
          }
        } else {
          if (total && !integers?.allowOnlyTotal) {
            throw new Error(
              `В этой настройке табеля запрещено одиночную оценку`,
            );
          }
          if (integers?.allowDay === false && day) {
            throw new Error(`Поле "день" запрещено заполнять`);
          }
          if (integers?.allowNight === false && night) {
            throw new Error(`Поле "ночь" запрещено заполнять`);
          }
          if (integers?.allowOverwork === false && overwork) {
            throw new Error(`Поле "переработка" запрещено заполнять`);
          }

          const selectedCount =
            (integers?.allowDay ? 1 : 0) +
            (integers?.allowNight ? 1 : 0) +
            (integers?.allowOverwork ? 1 : 0);

          const localTotal = (day || 0) + (night || 0) + (overwork || 0);

          if (selectedCount === 3) {
            if (day > 8) {
              throw new Error(`Значение дня не может превышать 8 часов`);
            }
            if (night > 8) {
              throw new Error(`Значение ночи не может превышать 8 часов`);
            }
            if (overwork > 8 && !isWeekend) {
              throw new Error(
                `Значение переработки не может превышать 8 часов`,
              );
            } else if (overwork > 24 && isWeekend) {
              throw new Error(
                `Значение переработки не может превышать 24 часа`,
              );
            }
            if (localTotal > 24) {
              throw new Error(
                `Суммарное значение ячеек за дату не может превышать 24 часа`,
              );
            }
          } else if (selectedCount === 2) {
            if (day > 12 && integers?.allowDay) {
              throw new Error(`Значение дня не может превышать 12 часов`);
            }
            if (night > 12 && integers?.allowNight) {
              throw new Error(`Значение ночи не может превышать 12 часов`);
            }
            if (overwork > 12 && integers?.allowOverwork) {
              throw new Error(
                `Значение переработки не может превышать 12 часов`,
              );
            }
            if (localTotal > 24) {
              throw new Error(
                `Суммарное значение ячеек за дату превышать 24 часа`,
              );
            }
          } else if (selectedCount === 1) {
            if (day > 24 && integers?.allowDay) {
              throw new Error(`Значение дня не может превышать 24 часа`);
            }
            if (night > 24 && integers?.allowNight) {
              throw new Error(`Значение ночи не может превышать 24 часа`);
            }
            if (overwork > 24 && integers?.allowOverwork) {
              throw new Error(
                `Значение переработки не может превышать 24 часа`,
              );
            }

            if (localTotal > 24) {
              throw new Error(
                `Суммарное значение ячеек за дату не может превышать 24 часа`,
              );
            }
          }
        }
      }
    }

    const dateOfFirstElement = Object.keys(dates)[0];
    const [_, month, year] = dateOfFirstElement.split('.').map(Number);

    const date = `${month}-${year}`;

    if (!isValidDateFormat(date)) {
      throw new BadRequestException(
        'Переданная в параметрах дата имеет некорректный формат',
      );
    }

    const isTotalInteger = integers?.allowOnlyTotal;

    const newDates = {};

    for (const key in dates) {
      const date = dates[key];

      if (typeof date === 'string') {
        newDates[key] = date;
      } else if (typeof date === 'object') {
        if (
          isTotalInteger
            ? !date?.total
            : (integers?.allowDay &&
                integers?.allowNight &&
                integers?.allowOverwork &&
                !date?.day &&
                !date?.night &&
                !date?.overwork) ||
              (integers?.allowDay &&
                integers?.allowNight &&
                !date?.day &&
                !date?.night) ||
              (integers?.allowDay &&
                integers?.allowOverwork &&
                !date?.day &&
                !date?.overwork) ||
              (integers?.allowNight &&
                integers?.allowOverwork &&
                !date?.night &&
                !date?.overwork) ||
              (integers?.allowDay && !date?.day) ||
              (integers?.allowNight && !date?.night) ||
              (integers?.allowOverwork && !date?.overwork)
        ) {
          newDates[key] = null;
          continue;
        }
        newDates[key] = date;
      }
    }

    const existingLog = await this.workLogModel.findOne({
      where: { employeeId, date: date, facilityId },
    });

    for (const [date, value] of Object.entries(newDates)) {
      const prevValue = existingLog?.workDays?.[date];
      const newValue = value;

      const parsedDate = parseDate(date);

      if (
        checkDateForSheetValidation(parsedDate) &&
        JSON.stringify(prevValue) !== JSON.stringify(newValue)
      ) {
        throw new BadRequestException(
          'Нельзя обновить данные за предыдущий месяц после 15 числа текущего месяца',
        );
      }
    }

    const targetDate = dayjs(date, 'MM-YYYY');
    const currentDate = dayjs();

    const monthDifference = targetDate.diff(currentDate, 'month');

    const allDaysInMonth = getDaysInMonth(monthDifference);

    const foundEmployeeById = allowedEmployees?.find(
      (employee) => employee.id === employeeId,
    );

    // const foundFacilityById = await facility

    for (let i = 0; i < allDaysInMonth?.length; i++) {
      const fullDate = allDaysInMonth[i].fullDate;
      const parsedDate = dayjs(parseDate(fullDate));

      const cellDate = dayjs(parseDate(fullDate));
      const cellDay = cellDate.date();

      if (dates[fullDate]) {
        // if (productionCalendar?.length) {
        //   for (let i = 0; i < productionCalendar?.length; i++) {
        //     const calendarDay = productionCalendar?.[i];

        //     const startDate = calendarDay?.startDate;
        //     const endDate = calendarDay?.endDate;

        //     if (startDate && (endDate || endDate === null)) {
        //       const start = dayjs(startDate);
        //       const end = endDate === null ? null : dayjs(endDate);

        //       if (
        //         (cellDate.isSame(start, 'day') ||
        //           cellDate.isAfter(start, 'date')) &&
        //         end === null
        //       ) {
        //         if (calendarDay.months.month === cellDate.month() + 1) {
        //           if (calendarDay.months.days.includes(cellDay)) {
        //             throw new BadRequestException(
        //               `Нельзя сохранить значение сотрудника - ${employeeShortName} на число на число - ${fullDate}, так как день является выходным`,
        //             );
        //           }
        //         }
        //       } else if (start && end) {
        //         if (
        //           (start?.isBefore(cellDate, 'day') ||
        //             (start?.isSame(cellDate, 'day') &&
        //               start.diff(end, 'hour') > 1)) &&
        //           (end?.isAfter(cellDate, 'day') ||
        //             end?.isSame(cellDate, 'day'))
        //         ) {
        //           if (calendarDay?.months?.days?.includes(cellDay)) {
        //             throw new BadRequestException(
        //               `Нельзя сохранить значение сотрудника - ${employeeShortName} на число на число - ${fullDate}, так как день является выходным`,
        //             );
        //           }
        //         }
        //       }
        //     }
        //   }
        // }

        for (let j = 0; j < foundEmployeeById?.facilityPeriods?.length; j++) {
          const facilityPeriod = foundEmployeeById?.facilityPeriods?.[j];

          const newFacilityPeriod = {
            ...facilityPeriod,
            startDate: dayjs(facilityPeriod.startDate)?.format(),
            createdAt: dayjs(facilityPeriod.createdAt)?.format(),
          };

          const startDate = dayjs(newFacilityPeriod?.startDate);
          const endDate = dayjs(newFacilityPeriod?.endDate);

          if (
            newFacilityPeriod?.endDate === null &&
            (parsedDate.isSame(startDate, 'day') ||
              parsedDate.isAfter(startDate))
          ) {
            break;
          }

          if (
            (startDate?.isBefore(parsedDate) ||
              startDate?.isSame(parsedDate, 'day')) &&
            (endDate?.isAfter(parsedDate) || endDate?.isSame(parsedDate, 'day'))
            // &&
            // dayjs(endDate)?.diff(startDate, 'hour') > 1
          ) {
            break;
          } else {
            if (
              parsedDate.isAfter(endDate) ||
              parsedDate.isSame(endDate, 'day')
            ) {
              throw new BadRequestException(
                `Сотрудник ${employeeShortName} не может быть заполнен на дату - ${fullDate} `,
              );
            }
            throw new BadRequestException(
              `Сотрудник ${employeeShortName} не был трудоустроен на дату - ${fullDate} `,
            );
          }
        }

        for (let i = 0; i < foundEmployeeById?.employmentPeriods?.length; i++) {
          const period = foundEmployeeById?.employmentPeriods?.[i];

          const newPeriod = {
            ...period,
            startDate: dayjs(period.startDate)?.format(),
            createdAt: dayjs(period.createdAt)?.format(),
            endDate: period.endDate ? dayjs(period.endDate)?.format() : null,
          };

          const isAfterStartDate = parsedDate?.isAfter(newPeriod.startDate);
          const isBeforeEndDate = parsedDate?.isBefore(newPeriod.endDate);
          const isSameAsStartDate = parsedDate?.isSame(
            newPeriod.startDate,
            'day',
          );
          const isSameAsEndDate = parsedDate?.isSame(newPeriod.endDate, 'day');

          const isCoincidingWithBoth = isSameAsStartDate && isSameAsEndDate;

          if (newPeriod.status === 'working') {
            if (dayjs(newPeriod?.startDate)?.isAfter(parsedDate)) {
              throw new BadRequestException(
                `Сотрудник ${employeeShortName} не был трудоустроен на дату - ${fullDate} `,
              );
            }
          }
          if (
            (newPeriod?.status === 'archived' ||
              newPeriod?.status === 'fired') &&
            newPeriod?.endDate === null &&
            parsedDate.isSame(newPeriod?.startDate, 'day')
          ) {
            throw new BadRequestException(
              `Сотрудник ${employeeShortName} не был трудоустроен на момент - ${fullDate} `,
            );
          }

          if (
            newPeriod.endDate === null &&
            parsedDate.isAfter(newPeriod?.startDate) &&
            newPeriod?.status === 'working'
          ) {
            continue;
          } else if (
            newPeriod.endDate !== null &&
            newPeriod.status === 'working' &&
            dayjs(newPeriod?.startDate)?.isBefore(parsedDate) &&
            dayjs(newPeriod?.endDate)?.isAfter(parsedDate)
          ) {
            continue;
          } else if (
            (isAfterStartDate && isBeforeEndDate) ||
            (isCoincidingWithBoth &&
              (newPeriod.endDate === null
                ? true
                : dayjs(newPeriod?.endDate)?.diff(newPeriod.startDate, 'hour') >
                  8))
          ) {
            continue;
          }
        }
      }
    }
  }

  async findFacility(facilityId: number) {
    const foundFacility = await this.facilitiesModel.findByPk(facilityId);

    if (!foundFacility) {
      throw new BadRequestException('Объект с переданным id не найден');
    }
  }

  async findByDate(date: string, facilityId: number) {
    await this.findFacility(facilityId);

    validateParamsDate(date);

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

  async download(date: string, facilityId: number) {
    await this.findFacility(facilityId);

    validateParamsDate(date);

    const facilitySettings = await this.facilitiesModel.findByPk(facilityId);
    const integers = facilitySettings?.settings?.integers;

    const targetDate = dayjs(date, 'MM-YYYY');
    const currentDate = dayjs();

    const monthDifference = targetDate.diff(currentDate, 'month');

    const allowedEmployees = await this.employeeService.findByFacilityId(
      facilityId,
      date,
    );
    const [month, year] = date.split('-');

    const foundFacilityById = await this.findFacilityById(
      facilityId,
      +year,
      +month,
    );

    const productionCalendar = (foundFacilityById as any)?.productionCalendar;

    const workLogsData = await this.findByDate(date, facilityId);

    const dates = getDaysInMonth(monthDifference);

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Таблица');

    workbook.creator = 'admin';
    workbook.lastModifiedBy = 'admin';
    workbook.created = new Date();
    workbook.modified = new Date();

    const tableNameCell = 'A1:P1';
    const ordererNameCell = 'A2:P2';

    worksheet.mergeCells(tableNameCell);
    applyAlignment(
      worksheet,
      tableNameCell,
      'Табель учета рабочего времени  ООО " Голд Рекрут"',
      // 'Табель учета рабочего времени',
      undefined,
      undefined,
      {
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
        },
        font: {
          bold: true,
          underline: true,
        },
      },
    );
    worksheet.mergeCells(ordererNameCell);
    applyAlignment(
      worksheet,
      ordererNameCell,
      // 'Компания-заказчик: ООО "УАЗ-Автокомпонент"',
      'Компания-заказчик: ',
      undefined,
      undefined,
      {
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
        },
        font: {
          bold: true,
          underline: true,
        },
      },
    );

    const periodNameCell = 'R1:U1';
    worksheet.mergeCells(periodNameCell);
    applyAlignment(
      worksheet,
      periodNameCell,
      'Отчетный период',
      undefined,
      undefined,
    );
    const periodStart = 'R2:S2';
    const periodEnd = 'T2:U2';

    const dateFillingStart = 'R3:S3';
    const dateFillingEnd = 'T3:U3';

    worksheet.mergeCells(periodStart);
    worksheet.mergeCells(periodEnd);

    worksheet.mergeCells(dateFillingStart);
    worksheet.mergeCells(dateFillingEnd);

    applyAlignment(
      worksheet,
      periodStart,
      `${dates?.[0]?.fullDate}`,
      10,
      undefined,
    );

    applyAlignment(
      worksheet,
      periodEnd,
      `${dates?.[dates?.length - 1]?.fullDate}`,
      10,
      undefined,
    );

    applyAlignment(
      worksheet,
      dateFillingStart,
      'Дата заполнения',
      undefined,
      undefined,
    );

    applyAlignment(
      worksheet,
      dateFillingEnd,
      `${dayjs().format('DD.MM.YYYY')}`,
      undefined,
      undefined,
    );

    worksheet.mergeCells('A5:A8');
    worksheet.mergeCells('B5:B8');
    worksheet.mergeCells('C5:C8');
    worksheet.mergeCells('D5:D8');

    applyAlignment(worksheet, 'A5:A8', '№ п/п', 5);
    applyAlignment(worksheet, 'B5:B8', 'Работник', 15);
    applyAlignment(worksheet, 'C5:C8', 'Вахтовик (0) / местный (1)', 10);
    applyAlignment(worksheet, 'D5:D8', '', 5);

    let startColumn = 'E';

    const allowOnlyTotal = integers?.allowOnlyTotal;

    const allowAllTypes =
      integers?.allowDay && integers?.allowNight && integers?.allowOverwork;

    const allowDayNight =
      integers?.allowDay && integers?.allowNight && !integers?.allowOverwork;
    const allowDayOverwork =
      integers?.allowDay && !integers?.allowNight && integers?.allowOverwork;
    const allowNightOverwork =
      !integers?.allowDay && integers?.allowNight && integers?.allowOverwork;

    const allowOnlyDay =
      integers?.allowDay && !integers?.allowNight && !integers?.allowOverwork;
    const allowOnlyNight =
      !integers?.allowDay && integers?.allowNight && !integers?.allowOverwork;
    const allowOnlyOverwork =
      !integers?.allowDay && !integers?.allowNight && integers?.allowOverwork;

    for (let i = 0; i < dates?.length; i++) {
      const day = dates[i];
      const isWeekend = day.isWeekend;
      let isInnerWeekend = false;

      const dayValue = day?.fullDate;

      if (dayValue && dateRegex.test(dayValue)) {
        if (productionCalendar?.length) {
          const cellDate = dayjs(parseDate(dayValue));
          const cellDay = cellDate.date();

          for (let i = 0; i < productionCalendar?.length; i++) {
            const calendarDay = productionCalendar?.[i];

            const startDate = calendarDay?.startDate;
            const endDate = calendarDay?.endDate;

            if (startDate && (endDate || endDate === null)) {
              const start = dayjs(startDate);
              const end = endDate === null ? null : dayjs(endDate);

              if (
                (cellDate.isSame(start, 'day') ||
                  cellDate.isAfter(start, 'date')) &&
                end === null
              ) {
                if (calendarDay.months.month === cellDate.month() + 1) {
                  if (calendarDay.months.days.includes(cellDay)) {
                    isInnerWeekend = true;
                  }
                }
              } else if (start && end) {
                if (
                  (start?.isBefore(cellDate, 'day') ||
                    (start?.isSame(cellDate, 'day') &&
                      start.diff(end, 'hour') > 1)) &&
                  (end?.isAfter(cellDate, 'day') ||
                    end?.isSame(cellDate, 'day'))
                ) {
                  if (calendarDay?.months?.days?.includes(cellDay)) {
                    isInnerWeekend = true;
                  }
                }
              }
            }
          }
        }
      }
      isInnerWeekend = isInnerWeekend ? isInnerWeekend : isWeekend;

      const dayCell = `${startColumn}5:${startColumn}6`;
      const dayNameCell = `${startColumn}7:${startColumn}8`;

      worksheet.getCell(dayCell).value = day.date;
      worksheet.getCell(dayNameCell).value = day.dayName;

      worksheet.mergeCells(dayCell);
      worksheet.mergeCells(dayNameCell);

      applyAlignment(
        worksheet,
        dayCell,
        undefined,
        7,
        isInnerWeekend ? true : false,
      );

      applyAlignment(
        worksheet,
        dayNameCell,
        undefined,
        7,
        isInnerWeekend ? true : false,
      );

      const upperCell = worksheet.getCell(`${startColumn}5:${startColumn}6`);
      const bottomCell = worksheet.getCell(`${startColumn}7:${startColumn}8`);

      upperCell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      bottomCell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      startColumn = incrementColumn(startColumn);
    }

    const nextColumn = incrementColumn(startColumn);
    const totalSmens = incrementColumn(nextColumn);
    const totalHours = incrementColumn(totalSmens);
    const totalSmensWeekends = incrementColumn(totalHours);
    const progulColumn = incrementColumn(totalSmensWeekends);
    const bolnichColumn = incrementColumn(progulColumn);
    const vihodColumn = incrementColumn(bolnichColumn);
    const otpuskColumn = incrementColumn(vihodColumn);
    const mejVahOtpuskColumn = incrementColumn(otpuskColumn);
    const adminOtpuskColumn = incrementColumn(mejVahOtpuskColumn);
    const comandirColumn = incrementColumn(adminOtpuskColumn);
    const materiColumn = incrementColumn(comandirColumn);

    // const totalHoursRow = `${startColumn}1:${nextColumn}1`;
    // const totalDayHoursRow = `${startColumn}2:${nextColumn}2`;
    // const totalNigthHoursRow = `${startColumn}3:${nextColumn}3`;
    // const totalFirstTwoHoursRow = `${startColumn}4`;
    // const totalSecondTwoHoursRow = `${nextColumn}4`;
    const totalSmensRow = `${totalSmens}5:${totalSmens}8`;
    const totalHoursSecondRow = `${totalHours}5:${totalHours}8`;
    const totalSmensWeekendsRow = `${totalSmensWeekends}5:${totalSmensWeekends}8`;

    const progulRow = `${progulColumn}5:${progulColumn}8`;
    const bolichniyRow = `${bolnichColumn}5:${bolnichColumn}8`;
    const vihodRow = `${vihodColumn}5:${vihodColumn}8`;
    const otpuskRow = `${otpuskColumn}5:${otpuskColumn}8`;
    const mejVahtRow = `${mejVahOtpuskColumn}5:${mejVahOtpuskColumn}8`;
    const adminOtpushRow = `${adminOtpuskColumn}5:${adminOtpuskColumn}8`;
    const comandirovochnieRow = `${comandirColumn}5:${comandirColumn}8`;
    const materiRow = `${materiColumn}5:${materiColumn}8`;

    // worksheet.mergeCells(totalHoursRow);
    // worksheet.mergeCells(totalDayHoursRow);
    // worksheet.mergeCells(totalNigthHoursRow);
    worksheet.mergeCells(totalSmensRow);
    worksheet.mergeCells(totalHoursSecondRow);
    worksheet.mergeCells(totalSmensWeekendsRow);
    worksheet.mergeCells(progulRow);
    worksheet.mergeCells(bolichniyRow);
    worksheet.mergeCells(vihodRow);
    worksheet.mergeCells(otpuskRow);
    worksheet.mergeCells(mejVahtRow);
    worksheet.mergeCells(adminOtpushRow);
    worksheet.mergeCells(comandirovochnieRow);
    worksheet.mergeCells(materiRow);

    if (integers?.allowOnlyTotal) {
      const totalHoursRow = `${startColumn}5:${nextColumn}8`;
      worksheet.mergeCells(totalHoursRow);
      applyAlignment(worksheet, totalHoursRow, 'Итого часов', 5);
    } else {
      if (integers.allowDay && integers.allowNight && integers.allowOverwork) {
        const totalHoursRow = `${startColumn}5:${nextColumn}5`;
        const totalDayHoursRow = `${startColumn}6:${nextColumn}6`;
        const totalNigthHoursRow = `${startColumn}7:${nextColumn}7`;
        const totalFirstTwoHoursRow = `${startColumn}8`;
        const totalSecondTwoHoursRow = `${nextColumn}8`;

        worksheet.mergeCells(totalHoursRow);
        worksheet.mergeCells(totalDayHoursRow);
        worksheet.mergeCells(totalNigthHoursRow);

        applyAlignment(worksheet, totalHoursRow, 'Итого часов', 5); // 1
        applyAlignment(worksheet, totalDayHoursRow, 'Дневные', 5); // 2
        applyAlignment(worksheet, totalNigthHoursRow, 'Ночные', 5); // 3
        applyAlignment(worksheet, totalFirstTwoHoursRow, 'Перв. 2 ч', 5); // 4
        applyAlignment(worksheet, totalSecondTwoHoursRow, 'Более 2 ч', 5); // 5
      } else if (
        integers.allowDay &&
        integers.allowNight &&
        !integers.allowOverwork
      ) {
        const totalHoursRow = `${startColumn}1:${nextColumn}1`;
        const totalDayHoursRow = `${startColumn}2:${nextColumn}2`;
        const totalNigthHoursRow = `${startColumn}3:${nextColumn}4`;

        worksheet.mergeCells(totalHoursRow);
        worksheet.mergeCells(totalDayHoursRow);
        worksheet.mergeCells(totalNigthHoursRow);

        applyAlignment(worksheet, totalHoursRow, 'Итого часов', 5); // 1
        applyAlignment(worksheet, totalDayHoursRow, 'Дневные', 5); // 2
        applyAlignment(worksheet, totalNigthHoursRow, 'Ночные', 5); // 3
      } else if (
        integers.allowDay &&
        !integers.allowNight &&
        integers.allowOverwork
      ) {
        const totalHoursRow = `${startColumn}5:${nextColumn}5`;
        const totalDayHoursRow = `${startColumn}6:${nextColumn}7`;
        const totalFirstTwoHoursRow = `${startColumn}8`;
        const totalSecondTwoHoursRow = `${nextColumn}8`;

        worksheet.mergeCells(totalHoursRow);
        worksheet.mergeCells(totalDayHoursRow);

        applyAlignment(worksheet, totalHoursRow, 'Итого часов', 5); // 1
        applyAlignment(worksheet, totalDayHoursRow, 'Дневные', 5); // 2
        applyAlignment(worksheet, totalFirstTwoHoursRow, 'Перв. 2 ч', 5); // 3
        applyAlignment(worksheet, totalSecondTwoHoursRow, 'Более 2 ч', 5); // 4
      } else if (
        !integers.allowDay &&
        integers.allowNight &&
        integers.allowOverwork
      ) {
        const totalHoursRow = `${startColumn}5:${nextColumn}5`;
        const totalNigthHoursRow = `${startColumn}6:${nextColumn}7`;
        const totalFirstTwoHoursRow = `${startColumn}8`;
        const totalSecondTwoHoursRow = `${nextColumn}8`;

        worksheet.mergeCells(totalHoursRow);
        worksheet.mergeCells(totalNigthHoursRow);

        applyAlignment(worksheet, totalHoursRow, 'Итого часов', 5); // 1
        applyAlignment(worksheet, totalNigthHoursRow, 'Ночные', 5); // 2
        applyAlignment(worksheet, totalFirstTwoHoursRow, 'Перв. 2 ч', 5); // 3
        applyAlignment(worksheet, totalSecondTwoHoursRow, 'Более 2 ч', 5); // 4
      } else if (
        integers.allowDay &&
        !integers.allowNight &&
        !integers.allowOverwork
      ) {
        const totalHoursRow = `${startColumn}5:${nextColumn}6`;
        const totalDayHoursRow = `${startColumn}7:${nextColumn}8`;

        worksheet.mergeCells(totalHoursRow);
        worksheet.mergeCells(totalDayHoursRow);

        applyAlignment(worksheet, totalHoursRow, 'Итого часов', 5); // 1
        applyAlignment(worksheet, totalDayHoursRow, 'Дневные', 5); // 2
      } else if (
        !integers.allowDay &&
        integers.allowNight &&
        !integers.allowOverwork
      ) {
        const totalHoursRow = `${startColumn}5:${nextColumn}6`;
        const totalNigthHoursRow = `${startColumn}7:${nextColumn}8`;

        worksheet.mergeCells(totalHoursRow);
        worksheet.mergeCells(totalNigthHoursRow);

        applyAlignment(worksheet, totalHoursRow, 'Итого часов', 5); // 1
        applyAlignment(worksheet, totalNigthHoursRow, 'Ночные', 5); // 2
      } else if (
        !integers.allowDay &&
        !integers.allowNight &&
        integers.allowOverwork
      ) {
        const totalHoursRow = `${startColumn}5:${nextColumn}7`;
        const totalFirstTwoHoursRow = `${startColumn}8`;
        const totalSecondTwoHoursRow = `${nextColumn}8`;

        worksheet.mergeCells(totalHoursRow);

        applyAlignment(worksheet, totalHoursRow, 'Итого часов', 5); // 1
        applyAlignment(worksheet, totalFirstTwoHoursRow, 'Перв. 2 ч', 5); // 2
        applyAlignment(worksheet, totalSecondTwoHoursRow, 'Более 2 ч', 5); // 3
      }
    }

    applyAlignment(worksheet, totalSmensRow, 'Итого смен', 15);
    applyAlignment(worksheet, totalHoursSecondRow, 'Итого часов (вых)', 15);
    applyAlignment(worksheet, totalSmensWeekendsRow, 'Итого смен (вых)', 15);

    applyAlignment(worksheet, progulRow, 'П', 5);
    applyAlignment(worksheet, bolichniyRow, 'Б', 5);
    applyAlignment(worksheet, vihodRow, 'В', 5);
    applyAlignment(worksheet, otpuskRow, 'О', 5);
    applyAlignment(worksheet, mejVahtRow, 'МО', 5);
    applyAlignment(worksheet, adminOtpushRow, 'А', 5);
    applyAlignment(worksheet, comandirovochnieRow, 'К', 5);
    applyAlignment(worksheet, materiRow, 'М', 5);

    const a1a2Cell = worksheet.getCell('A5:A6');
    const b1b2Cell = worksheet.getCell('B5:B6');

    a1a2Cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
    b1b2Cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    let employeeStart = 9;
    let employeeEnd = integers?.allowOnlyTotal
      ? 10
      : integers?.allowDay && integers?.allowNight && integers?.allowOverwork
        ? 11
        : 10;

    for (let i = 0; i < allowedEmployees?.length; i++) {
      const employee = allowedEmployees[i];

      const indexCell = `A${employeeStart}:A${employeeEnd}`;

      const fioCell = `B${employeeStart}:B${employeeEnd}`;
      const isLocalCell = `C${employeeStart}:C${employeeEnd}`;

      const isLocal = !employee?.lastIsOutOfTown;

      worksheet.getCell(indexCell).value = i + 1;
      worksheet.getCell(fioCell).value = `${getShortUserFio(employee)}`;
      worksheet.getCell(isLocalCell).value = employee.lastIsOutOfTown ? 1 : 0;

      worksheet.mergeCells(indexCell);
      worksheet.mergeCells(fioCell);
      worksheet.mergeCells(isLocalCell);

      applyAlignment(worksheet, indexCell, undefined, undefined, undefined, {
        alignment: {
          horizontal: 'left',
          vertical: 'middle',
        },
        font: {
          bold: true,
        },
      });
      applyAlignment(worksheet, fioCell, undefined, undefined, undefined, {
        alignment: {
          horizontal: 'left',
          vertical: 'middle',
        },
        font: {
          bold: true,
        },
      });
      applyAlignment(worksheet, isLocalCell, undefined, undefined, undefined, {
        alignment: {
          horizontal: 'left',
          vertical: 'middle',
        },
        font: {
          bold: true,
        },
      });

      if (integers.allowOnlyTotal) {
        const cell = `D${employeeStart}:D${employeeStart + 1}`;
        worksheet.getCell(cell).value = 'Часы';
        worksheet.mergeCells(cell);
        applyAlignment(worksheet, cell);
      } else {
        if (
          integers.allowDay &&
          integers.allowNight &&
          integers.allowOverwork
        ) {
          const dayCell = `D${employeeStart}`;
          const nightCell = `D${employeeStart + 1}`;
          const overworkCell = `D${employeeStart + 2}`;

          worksheet.getCell(dayCell).value = 'д';
          worksheet.getCell(nightCell).value = 'н';
          worksheet.getCell(overworkCell).value = 'п';

          applyAlignment(worksheet, dayCell);
          applyAlignment(worksheet, nightCell);
          applyAlignment(worksheet, overworkCell);
        } else if (
          integers.allowDay &&
          integers.allowNight &&
          !integers.allowOverwork
        ) {
          const dayCell = `D${employeeStart}`;
          const nightCell = `D${employeeStart + 1}`;

          worksheet.getCell(dayCell).value = 'д';
          worksheet.getCell(nightCell).value = 'н'; // Указываем начальную ячейку

          worksheet.mergeCells(nightCell);

          applyAlignment(worksheet, dayCell);
          applyAlignment(worksheet, nightCell);
        } else if (
          integers.allowDay &&
          !integers.allowNight &&
          integers.allowOverwork
        ) {
          const dayCell = `D${employeeStart}`;
          const overworkCell = `D${employeeStart + 1}`;

          worksheet.getCell(dayCell).value = 'д';
          worksheet.getCell(overworkCell).value = 'п'; // Указываем начальную ячейку

          worksheet.mergeCells(overworkCell);

          applyAlignment(worksheet, dayCell);
          applyAlignment(worksheet, overworkCell);
        } else if (
          !integers.allowDay &&
          integers.allowNight &&
          integers.allowOverwork
        ) {
          const nightCell = `D${employeeStart}`;
          const overworkCell = `D${employeeStart + 1}`;

          worksheet.getCell(nightCell).value = 'н';
          worksheet.getCell(overworkCell).value = 'п'; // Указываем начальную ячейку

          worksheet.mergeCells(overworkCell);

          applyAlignment(worksheet, nightCell);
          applyAlignment(worksheet, overworkCell);
        } else if (
          integers.allowDay &&
          !integers.allowNight &&
          !integers.allowOverwork
        ) {
          const dayCell = `D${employeeStart}:D${employeeStart + 1}`;

          worksheet.getCell(dayCell).value = 'д';

          worksheet.mergeCells(dayCell);

          applyAlignment(worksheet, dayCell);
        } else if (
          !integers.allowDay &&
          integers.allowNight &&
          !integers.allowOverwork
        ) {
          const nightCell = `D${employeeStart}:D${employeeStart + 1}`;

          worksheet.getCell(nightCell).value = 'н';

          worksheet.mergeCells(nightCell);

          applyAlignment(worksheet, nightCell);
        } else if (
          !integers.allowDay &&
          !integers.allowNight &&
          integers.allowOverwork
        ) {
          const overworkCell = `D${employeeStart}:D${employeeStart + 1}`;

          worksheet.getCell(overworkCell).value = 'п';

          worksheet.mergeCells(overworkCell);

          applyAlignment(worksheet, overworkCell);
        }
      }

      const foundEmployee = workLogsData.find(
        (el) => el.employee?.id === employee?.id,
      );

      let startColumn = 'E';

      for (let j = 0; j < dates?.length; j++) {
        const day = dates[j];
        const isWeekend = day.isWeekend;

        const dayValue = day?.fullDate;

        let isInnerWeekend = false;

        if (dayValue && dateRegex.test(dayValue)) {
          if (productionCalendar?.length) {
            const cellDate = dayjs(parseDate(dayValue));
            const cellDay = cellDate.date();

            for (let i = 0; i < productionCalendar?.length; i++) {
              const calendarDay = productionCalendar?.[i];

              const startDate = calendarDay?.startDate;
              const endDate = calendarDay?.endDate;

              if (startDate && (endDate || endDate === null)) {
                const start = dayjs(startDate);
                const end = endDate === null ? null : dayjs(endDate);

                if (
                  (cellDate.isSame(start, 'day') ||
                    cellDate.isAfter(start, 'date')) &&
                  end === null
                ) {
                  if (calendarDay.months.month === cellDate.month() + 1) {
                    if (calendarDay.months.days.includes(cellDay)) {
                      isInnerWeekend = true;
                    }
                  }
                } else if (start && end) {
                  if (
                    (start?.isBefore(cellDate, 'day') ||
                      (start?.isSame(cellDate, 'day') &&
                        start.diff(end, 'hour') > 1)) &&
                    (end?.isAfter(cellDate, 'day') ||
                      end?.isSame(cellDate, 'day'))
                  ) {
                    if (calendarDay?.months?.days?.includes(cellDay)) {
                      isInnerWeekend = true;
                    }
                  }
                }
              }
            }
          }
        }

        isInnerWeekend = isInnerWeekend ? isInnerWeekend : isWeekend;

        const cellDate = dayjs(parseDate(day.fullDate));

        const cellData = foundEmployee?.workDays?.[day.fullDate];

        const facilityPeriods = employee.facilityPeriods;

        let needToContinue: boolean = false;

        for (let i = 0; i < facilityPeriods?.length; i++) {
          const facilityPeriod = facilityPeriods?.[i];

          const newFacilityPeriod = {
            ...facilityPeriod,
            startDate: dayjs(facilityPeriod.startDate)?.format(),
            endDate: facilityPeriod.endDate
              ? dayjs(facilityPeriod.endDate)?.format()
              : null,
          };

          const startDate = dayjs(newFacilityPeriod?.startDate);
          const endDate = dayjs(newFacilityPeriod?.endDate);

          if (
            newFacilityPeriod?.endDate === null &&
            (cellDate.isSame(startDate, 'day') || cellDate.isAfter(startDate))
          ) {
            break;
          }

          if (
            (startDate?.isBefore(cellDate) ||
              startDate?.isSame(cellDate, 'day')) &&
            (endDate?.isAfter(cellDate) || endDate?.isSame(cellDate, 'day')) &&
            dayjs(endDate)?.diff(startDate, 'hour') > 1
          ) {
            break;
          } else {
            if (cellDate.isAfter(endDate) || cellDate.isSame(endDate, 'day')) {
              const cellId = `${startColumn}${employeeStart}:${startColumn}${employeeEnd}`;
              worksheet.unMergeCells(cellId);
              worksheet.getCell(cellId).value = 'Удален';

              worksheet.mergeCells(cellId);
              needToContinue = true;
              applyAlignment(
                worksheet,
                cellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
              break;
            }
            const cellId = `${startColumn}${employeeStart}:${startColumn}${employeeEnd}`;
            worksheet.unMergeCells(cellId);

            worksheet.getCell(cellId).value = 'Н/у';
            worksheet.mergeCells(cellId);
            needToContinue = true;

            applyAlignment(
              worksheet,
              cellId,
              undefined,
              undefined,
              isInnerWeekend ? true : undefined,
            );
            break;
          }
        }

        const employmentPeriods = employee?.employmentPeriods;

        for (let i = 0; i < employmentPeriods?.length; i++) {
          const period = employmentPeriods?.[i];

          const newPeriod = {
            ...period.toJSON(),
            startDate: dayjs(period.startDate)?.format(),
            endDate: period.endDate ? dayjs(period.endDate)?.format() : null,
          };

          const isAfterStartDate = cellDate?.isAfter(newPeriod.startDate);
          const isBeforeEndDate = cellDate?.isBefore(newPeriod.endDate);
          const isSameAsStartDate = cellDate?.isSame(
            newPeriod.startDate,
            'day',
          );
          const isSameAsEndDate = cellDate?.isSame(newPeriod.endDate, 'day');

          const isCoincidingWithBoth = isSameAsStartDate && isSameAsEndDate;

          if (newPeriod.status === 'working') {
            if (dayjs(newPeriod?.startDate)?.isAfter(cellDate, 'day')) {
              const cellId = `${startColumn}${employeeStart}:${startColumn}${employeeEnd}`;

              if (worksheet.getCell(cellId).value) continue;

              worksheet.getCell(cellId).value = 'Н/у';
              worksheet.unMergeCells(cellId);
              worksheet.mergeCells(cellId);

              applyAlignment(
                worksheet,
                cellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
              break;
            }
          }
          if (
            (newPeriod?.status === 'archived' ||
              newPeriod?.status === 'fired') &&
            newPeriod?.endDate === null &&
            cellDate.isAfter(newPeriod?.startDate)
          ) {
            const cellId = `${startColumn}${employeeStart}:${startColumn}${employeeEnd}`;
            if (worksheet.getCell(cellId).value) continue;

            worksheet.getCell(cellId).value = workerStatuses[newPeriod?.status];
            worksheet.unMergeCells(cellId);
            worksheet.mergeCells(cellId);
            applyAlignment(
              worksheet,
              cellId,
              undefined,
              undefined,
              isInnerWeekend ? true : undefined,
            );
            break;
          }

          if (
            newPeriod.endDate === null &&
            cellDate.isAfter(newPeriod?.startDate) &&
            newPeriod?.status === 'working'
          ) {
            continue;
          } else if (
            newPeriod.endDate !== null &&
            newPeriod.status === 'working' &&
            dayjs(newPeriod?.startDate)?.isBefore(cellDate) &&
            dayjs(newPeriod?.endDate)?.isAfter(cellDate)
          ) {
            continue;
          } else if (
            (isAfterStartDate && isBeforeEndDate) ||
            (isCoincidingWithBoth &&
              (newPeriod.endDate === null
                ? true
                : dayjs(newPeriod?.endDate)?.diff(newPeriod.startDate, 'hour') >
                  8))
          ) {
            continue;
          }
        }

        if (typeof cellData === 'string') {
          if (cellData?.toLowerCase() === 'В'.toLowerCase()) {
          }
          // const cellId = `${startColumn}${employeeStart}:${startColumn}${employeeEnd}`;
          //
          const cellId = `${startColumn}${employeeStart}:${startColumn}${employeeEnd}`;
          worksheet.getCell(cellId).value = cellData;
          worksheet.mergeCells(cellId);

          applyAlignment(
            worksheet,
            cellId,
            undefined,
            undefined,
            isInnerWeekend ? true : undefined,
          );
        } else {
          if (integers?.allowOnlyTotal) {
            const cellId = `${startColumn}${employeeStart}:${startColumn}${employeeEnd}`;
            const timeCell = worksheet.getCell(cellId);

            timeCell.value = cellData?.total;

            if (worksheet?.getCell(cellId).isMerged) {
              worksheet.unMergeCells(cellId);
            }

            worksheet.mergeCells(cellId);
            applyAlignment(
              worksheet,
              cellId,
              undefined,
              undefined,
              isInnerWeekend ? true : undefined,
            );
          } else {
            if (
              integers.allowDay &&
              integers.allowNight &&
              integers.allowOverwork
            ) {
              const dayCellId = `${startColumn}${employeeStart}:${startColumn}${employeeStart}`;
              const nightCellId = `${startColumn}${employeeStart + 1}:${startColumn}${employeeStart + 1}`;
              const overworkCellId = `${startColumn}${employeeStart + 2}:${startColumn}${employeeStart + 2}`;

              const dayTime = cellData?.day;
              const nightTime = cellData?.night;
              const overworkTime = cellData?.overwork;

              const dayTimeCell = worksheet.getCell(dayCellId);
              const nightTimeCell = worksheet.getCell(nightCellId);
              const overworkTimeCell = worksheet.getCell(overworkCellId);

              dayTimeCell.value = dayTime;
              nightTimeCell.value = nightTime;
              overworkTimeCell.value = overworkTime;

              applyAlignment(
                worksheet,
                dayCellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
              applyAlignment(
                worksheet,
                nightCellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
              applyAlignment(
                worksheet,
                overworkCellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
            } else if (
              integers.allowDay &&
              integers.allowNight &&
              !integers.allowOverwork
            ) {
              const dayCellId = `${startColumn}${employeeStart}:${startColumn}${employeeStart}`;
              const nightCellId = `${startColumn}${employeeEnd}:${startColumn}${employeeEnd}`;

              const dayTime = cellData?.day;
              const nightTime = cellData?.night;

              const dayTimeCell = worksheet.getCell(dayCellId);
              const nightTimeCell = worksheet.getCell(nightCellId);

              dayTimeCell.value = dayTime;
              nightTimeCell.value = nightTime;

              applyAlignment(
                worksheet,
                dayCellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
              applyAlignment(
                worksheet,
                nightCellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
            } else if (
              !integers.allowDay &&
              integers.allowNight &&
              integers.allowOverwork
            ) {
              const nightCellId = `${startColumn}${employeeStart}:${startColumn}${employeeStart}`;
              const overworkCellId = `${startColumn}${isInnerWeekend ? employeeStart : employeeEnd}:${startColumn}${employeeEnd}`;

              if (isInnerWeekend) {
                worksheet.unMergeCells(overworkCellId);
                worksheet.mergeCells(overworkCellId);
              }

              const nightTime = cellData?.night;
              const overworkTime = cellData?.overwork;

              const nightTimeCell = worksheet.getCell(nightCellId);
              const overworkTimeCell = worksheet.getCell(overworkCellId);

              nightTimeCell.value = nightTime;
              overworkTimeCell.value = overworkTime;

              applyAlignment(
                worksheet,
                nightCellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
              applyAlignment(
                worksheet,
                overworkCellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
            } else if (
              integers.allowDay &&
              !integers.allowNight &&
              integers.allowOverwork
            ) {
              const dayCellId = `${startColumn}${employeeStart}:${startColumn}${employeeStart}`;
              const overworkCellId = `${startColumn}${isInnerWeekend ? employeeStart : employeeEnd}:${startColumn}${employeeEnd}`;

              if (isInnerWeekend) {
                worksheet.unMergeCells(overworkCellId);
                worksheet.mergeCells(overworkCellId);
              }

              const dayTime = cellData?.day;
              const overworkTime = cellData?.overwork;

              const dayTimeCell = worksheet.getCell(dayCellId);
              const overworkTimeCell = worksheet.getCell(overworkCellId);

              dayTimeCell.value = dayTime;
              overworkTimeCell.value = overworkTime;

              applyAlignment(
                worksheet,
                dayCellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
              applyAlignment(
                worksheet,
                overworkCellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
            } else if (
              integers.allowDay &&
              !integers?.allowNight &&
              !integers?.allowOverwork
            ) {
              const dayCellId = `${startColumn}${employeeStart}:${startColumn}${employeeEnd}`;

              const dayTime = cellData?.day;

              const dayTimeCell = worksheet.getCell(dayCellId);

              dayTimeCell.value = dayTime;

              applyAlignment(
                worksheet,
                dayCellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
            } else if (
              !integers.allowDay &&
              integers?.allowNight &&
              !integers?.allowOverwork
            ) {
              const nightCellId = `${startColumn}${employeeStart}:${startColumn}${employeeEnd}`;

              const nightTime = cellData?.night;

              const nightTimeCell = worksheet.getCell(nightCellId);

              nightTimeCell.value = nightTime;

              applyAlignment(
                worksheet,
                nightCellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
            } else if (
              !integers.allowDay &&
              !integers?.allowNight &&
              integers?.allowOverwork
            ) {
              const overworkCellId = `${startColumn}${employeeStart}:${startColumn}${employeeEnd}`;

              const overworkTime = cellData?.overwork;

              const overworkTimeCell = worksheet.getCell(overworkCellId);

              overworkTimeCell.value = overworkTime;

              worksheet.mergeCells(overworkCellId);

              applyAlignment(
                worksheet,
                overworkCellId,
                undefined,
                undefined,
                isInnerWeekend ? true : undefined,
              );
            }
          }
        }

        startColumn = incrementColumn(startColumn);
      }

      const nextColumn = incrementColumn(startColumn);

      const totalSmens = incrementColumn(nextColumn);
      const totalHoursWeekends = incrementColumn(totalSmens);
      const totalSmensWeekends = incrementColumn(totalHoursWeekends);

      const totalRowProguls = incrementColumn(totalSmensWeekends);
      const totalRowBolnich = incrementColumn(totalRowProguls);
      const totalRowVihod = incrementColumn(totalRowBolnich);
      const totalRowOtpusk = incrementColumn(totalRowVihod);
      const totalRowMejVahOtpusk = incrementColumn(totalRowOtpusk);
      const totalRowAdminOtpush = incrementColumn(totalRowMejVahOtpusk);
      const totalRowComandirovochnie = incrementColumn(totalRowAdminOtpush);
      const totalRowMateri = incrementColumn(totalRowComandirovochnie);

      const singleCell = `${startColumn}${employeeStart}:${nextColumn}${employeeEnd}`;

      const singleOverworkFirstCell = `${startColumn}${employeeStart}:${startColumn}${employeeEnd}`;
      const singleOverworkSecondCell = `${nextColumn}${employeeStart}:${nextColumn}${employeeEnd}`;

      const firstDoubleCell = `${startColumn}${employeeStart}:${nextColumn}${employeeStart}`;
      const secondDoubleCell = `${startColumn}${employeeEnd}:${nextColumn}${employeeEnd}`;

      const totalDayHoursCell = `${startColumn}${employeeStart}:${nextColumn}${employeeStart}`;
      const totalNightHoursCell = `${startColumn}${employeeStart + 1}:${nextColumn}${employeeStart + 1}`;
      const totalOverworkFirstHoursCell = `${startColumn}${employeeEnd}`;
      const totalOverworkSecondHoursCell = `${nextColumn}${employeeEnd}`;

      const totalSmensCell = `${totalSmens}${employeeStart}:${totalSmens}${employeeEnd}`;
      const totalWeekendsHoursCell = `${totalHoursWeekends}${employeeStart}:${totalHoursWeekends}${employeeEnd}`;
      const totalWeekendsSmensCell = `${totalSmensWeekends}${employeeStart}:${totalSmensWeekends}${employeeEnd}`;

      const totalProgulCell = `${totalRowProguls}${employeeStart}:${totalRowProguls}${employeeEnd}`;
      const totalBolnichCell = `${totalRowBolnich}${employeeStart}:${totalRowBolnich}${employeeEnd}`;
      const totalVihodCell = `${totalRowVihod}${employeeStart}:${totalRowVihod}${employeeEnd}`;
      const totalOtpushCell = `${totalRowOtpusk}${employeeStart}:${totalRowOtpusk}${employeeEnd}`;
      const totalMejvahOtpuskCell = `${totalRowMejVahOtpusk}${employeeStart}:${totalRowMejVahOtpusk}${employeeEnd}`;
      const totalAdminOtpuskCell = `${totalRowAdminOtpush}${employeeStart}:${totalRowAdminOtpush}${employeeEnd}`;
      const totalComandirovochnieCell = `${totalRowComandirovochnie}${employeeStart}:${totalRowComandirovochnie}${employeeEnd}`;
      const totalMateriCell = `${totalRowMateri}${employeeStart}:${totalRowMateri}${employeeEnd}`;

      if (integers?.allowOnlyTotal) {
        worksheet.mergeCells(singleCell);
      } else {
        if (
          integers?.allowDay &&
          integers?.allowNight &&
          integers?.allowOverwork
        ) {
          worksheet.mergeCells(totalDayHoursCell);
          worksheet.mergeCells(totalNightHoursCell);
        } else if (
          integers?.allowDay &&
          integers?.allowNight &&
          !integers?.allowOverwork
        ) {
          worksheet.mergeCells(firstDoubleCell);
          worksheet.mergeCells(secondDoubleCell);
        } else if (
          integers?.allowDay &&
          !integers?.allowNight &&
          integers?.allowOverwork
        ) {
          worksheet.mergeCells(firstDoubleCell);
        } else if (
          !integers?.allowDay &&
          integers?.allowNight &&
          integers?.allowOverwork
        ) {
          worksheet.mergeCells(firstDoubleCell);
        } else if (
          integers?.allowDay &&
          !integers?.allowNight &&
          !integers?.allowOverwork
        ) {
          worksheet.mergeCells(singleCell);
        } else if (
          !integers?.allowDay &&
          integers?.allowNight &&
          !integers?.allowOverwork
        ) {
          worksheet.mergeCells(singleCell);
        } else if (
          !integers.allowDay &&
          !integers.allowNight &&
          integers.allowOverwork
        ) {
          worksheet.mergeCells(singleOverworkFirstCell);
          worksheet.mergeCells(singleOverworkSecondCell);
        }
      }

      worksheet.mergeCells(totalSmensCell);
      worksheet.mergeCells(totalWeekendsHoursCell);
      worksheet.mergeCells(totalWeekendsSmensCell);

      worksheet.mergeCells(totalProgulCell);
      worksheet.mergeCells(totalBolnichCell);
      worksheet.mergeCells(totalVihodCell);
      worksheet.mergeCells(totalOtpushCell);
      worksheet.mergeCells(totalMejvahOtpuskCell);
      worksheet.mergeCells(totalAdminOtpuskCell);
      worksheet.mergeCells(totalComandirovochnieCell);
      worksheet.mergeCells(totalMateriCell);

      let totalHoursSum: number = 0;
      let dayHoursSum: number = 0;
      let nightHoursSum: number = 0;

      let totalWeekendSum: number = 0;

      let countOfWorkDays: number = 0;

      let countOfWeekendWorkDays: number = 0;

      let hoursOfOverworkTwoHours: number = 0;
      let hoursOfOverworkMoreTwoHours: number = 0;

      let newStartColumn = 'E';

      const lettersSum: Omit<lettersSumType, 'Я'> = {
        А: 0,
        Б: 0,
        В: 0,
        МО: 0,
        О: 0,
        П: 0,
        К: 0,
        М: 0,
      };

      for (let j = 0; j < dates?.length; j++) {
        const day = dates[j];

        const dayValue = day?.fullDate;

        const isWeekend = day.isWeekend;

        let isInnerWeekend = false;

        if (dayValue && dateRegex.test(dayValue)) {
          if (productionCalendar?.length) {
            const cellDate = dayjs(parseDate(dayValue));
            const cellDay = cellDate.date();

            for (let i = 0; i < productionCalendar?.length; i++) {
              const calendarDay = productionCalendar?.[i];

              const startDate = calendarDay?.startDate;
              const endDate = calendarDay?.endDate;

              if (startDate && (endDate || endDate === null)) {
                const start = dayjs(startDate);
                const end = endDate === null ? null : dayjs(endDate);

                if (
                  (cellDate.isSame(start, 'day') ||
                    cellDate.isAfter(start, 'date')) &&
                  end === null
                ) {
                  if (calendarDay.months.month === cellDate.month() + 1) {
                    if (calendarDay.months.days.includes(cellDay)) {
                      isInnerWeekend = true;
                    }
                  }
                } else if (start && end) {
                  if (
                    (start?.isBefore(cellDate, 'day') ||
                      (start?.isSame(cellDate, 'day') &&
                        start.diff(end, 'hour') > 1)) &&
                    (end?.isAfter(cellDate, 'day') ||
                      end?.isSame(cellDate, 'day'))
                  ) {
                    if (calendarDay?.months?.days?.includes(cellDay)) {
                      isInnerWeekend = true;
                    }
                  }
                }
              }
            }
          }
        }
        isInnerWeekend = isInnerWeekend ? isInnerWeekend : isWeekend;

        const cellData = foundEmployee?.workDays?.[
          day.fullDate
        ] as cellValueType;

        if (typeof cellData === 'string') {
          const newCellData = cellData as keyof Omit<lettersSumType, 'Я'>;
          if (newCellData) {
            //@ts-ignore
            lettersSum[cellData] = ((lettersSum[cellData] as number) || 0) + 1;
          }
        }

        if (
          typeof cellData === 'object' &&
          cellData?.overwork &&
          !isInnerWeekend
        ) {
          const value = +(cellData?.overwork ?? 0);

          if (value <= 2) {
            hoursOfOverworkTwoHours += value || 0;
          }
          if (value > 2) {
            hoursOfOverworkTwoHours += 2;
            hoursOfOverworkMoreTwoHours += value - 2 || 0;
          }
        }

        if (typeof cellData === 'object' && !isInnerWeekend) {
          if (integers?.allowOnlyTotal) {
            totalHoursSum += cellData.total || 0;
          } else {
            if (integers?.allowDay && integers?.allowNight) {
              dayHoursSum += cellData?.day || 0;
              nightHoursSum += cellData?.night || 0;
            } else if (integers?.allowDay && !integers?.allowNight) {
              dayHoursSum += cellData?.day || 0;
            } else if (!integers?.allowDay && integers?.allowNight) {
              nightHoursSum += cellData?.night || 0;
            }
          }

          if (
            (+cellData?.day || +cellData?.night || +cellData?.total) &&
            !isInnerWeekend
          ) {
            countOfWorkDays = (countOfWorkDays || 0) + 1;
          }
        }
        if (typeof cellData === 'object' && isInnerWeekend) {
          if (integers?.allowOnlyTotal) {
            totalWeekendSum += cellData.total || 0;
          } else {
            if (integers?.allowDay && integers?.allowNight) {
              totalWeekendSum += cellData?.day || 0;
              totalWeekendSum += cellData?.night || 0;
            } else if (integers?.allowDay && !integers?.allowNight) {
              totalWeekendSum += cellData?.day || 0;
            } else if (!integers?.allowDay && integers?.allowNight) {
              totalWeekendSum += cellData?.night || 0;
            }
          }

          if (!isLocal) {
            if (+cellData?.overwork) {
              countOfWeekendWorkDays = (countOfWeekendWorkDays || 0) + 1;

              totalWeekendSum += cellData?.overwork || 0;
            }
          } else {
            if (cellData?.overwork) {
              countOfWorkDays = (countOfWorkDays || 0) + 1;
              totalWeekendSum += cellData?.overwork || 0;
            }
          }
        }

        if (typeof cellData === 'string' && isInnerWeekend) {
          if (
            (cellData as string)?.toLowerCase() === 'В'.toLowerCase() &&
            isLocal
          ) {
            countOfWorkDays += 1;
          }
        }

        newStartColumn = incrementColumn(newStartColumn);
      }

      if (integers?.allowOnlyTotal) {
        worksheet.getCell(singleCell).value = totalHoursSum;
      } else {
        if (
          integers?.allowDay &&
          integers?.allowNight &&
          integers?.allowOverwork
        ) {
          worksheet.getCell(totalDayHoursCell).value = dayHoursSum || 0;
          worksheet.getCell(totalNightHoursCell).value = nightHoursSum || 0;
          worksheet.getCell(totalOverworkFirstHoursCell).value =
            hoursOfOverworkTwoHours || 0;
          worksheet.getCell(totalOverworkSecondHoursCell).value =
            hoursOfOverworkMoreTwoHours || 0;
        } else if (
          !integers?.allowDay &&
          integers?.allowNight &&
          integers?.allowOverwork
        ) {
          worksheet.getCell(firstDoubleCell).value = nightHoursSum || 0;
          worksheet.getCell(totalOverworkFirstHoursCell).value =
            hoursOfOverworkTwoHours || 0;
          worksheet.getCell(totalOverworkSecondHoursCell).value =
            hoursOfOverworkMoreTwoHours || 0;
        } else if (
          integers?.allowDay &&
          !integers?.allowNight &&
          integers?.allowOverwork
        ) {
          worksheet.getCell(firstDoubleCell).value = dayHoursSum || 0;
          worksheet.getCell(totalOverworkFirstHoursCell).value =
            hoursOfOverworkTwoHours || 0;
          worksheet.getCell(totalOverworkSecondHoursCell).value =
            hoursOfOverworkMoreTwoHours || 0;
        } else if (
          integers?.allowDay &&
          integers?.allowNight &&
          !integers?.allowOverwork
        ) {
          worksheet.getCell(firstDoubleCell).value = dayHoursSum || 0;

          worksheet.getCell(secondDoubleCell).value = nightHoursSum || 0;
        } else if (
          !integers?.allowDay &&
          !integers?.allowNight &&
          integers?.allowOverwork
        ) {
          worksheet.getCell(singleOverworkFirstCell).value =
            hoursOfOverworkTwoHours || 0;
          worksheet.getCell(singleOverworkSecondCell).value =
            hoursOfOverworkMoreTwoHours || 0;
        } else if (
          integers?.allowDay &&
          !integers?.allowNight &&
          !integers?.allowOverwork
        ) {
          worksheet.getCell(singleCell).value = dayHoursSum || 0;
        } else if (
          !integers?.allowDay &&
          integers?.allowNight &&
          !integers?.allowOverwork
        ) {
          worksheet.getCell(singleCell).value = nightHoursSum || 0;
        }
      }
      worksheet.getCell(totalSmensCell).value = countOfWorkDays || 0;
      worksheet.getCell(totalWeekendsHoursCell).value = isNaN(totalWeekendSum)
        ? 0
        : totalWeekendSum;
      worksheet.getCell(totalWeekendsSmensCell).value = isLocal
        ? '-'
        : countOfWeekendWorkDays;

      applyAlignment(worksheet, totalDayHoursCell);
      applyAlignment(worksheet, totalNightHoursCell);
      applyAlignment(worksheet, totalOverworkFirstHoursCell);
      applyAlignment(worksheet, totalOverworkSecondHoursCell);
      applyAlignment(worksheet, totalSmensCell);
      applyAlignment(worksheet, totalWeekendsHoursCell);
      applyAlignment(worksheet, totalWeekendsSmensCell);

      applyAlignment(worksheet, totalProgulCell, lettersSum.П);
      applyAlignment(worksheet, totalBolnichCell, lettersSum.Б);
      applyAlignment(worksheet, totalVihodCell, lettersSum.В);
      applyAlignment(worksheet, totalOtpushCell, lettersSum.О);
      applyAlignment(worksheet, totalMejvahOtpuskCell, lettersSum.МО);
      applyAlignment(worksheet, totalAdminOtpuskCell, lettersSum.А);
      applyAlignment(worksheet, totalComandirovochnieCell, lettersSum.К);
      applyAlignment(worksheet, totalMateriCell, lettersSum.М);

      employeeStart =
        employeeStart +
        (integers?.allowOnlyTotal
          ? 2
          : integers?.allowDay &&
              integers?.allowNight &&
              integers?.allowOverwork
            ? 3
            : 2);
      employeeEnd =
        employeeEnd +
        (integers?.allowOnlyTotal
          ? 2
          : integers?.allowDay &&
              integers?.allowNight &&
              integers?.allowOverwork
            ? 3
            : 2);
    }

    const totalSingleCell = `B${employeeStart}`;

    if (integers?.allowOnlyTotal) {
      const totalCell = `B${employeeStart}:B${employeeEnd}}`;
      worksheet.getCell(totalCell).value = 'Итого: часов';

      worksheet.mergeCells(totalCell);

      applyAlignment(worksheet, totalCell);
      applyAlignment(worksheet, `B${employeeStart + 2}`, 'П');
      applyAlignment(worksheet, `B${employeeStart + 3}`, 'Б');
      applyAlignment(worksheet, `B${employeeStart + 4}`, 'В');
      applyAlignment(worksheet, `B${employeeStart + 5}`, 'О');
      applyAlignment(worksheet, `B${employeeStart + 6}`, 'МО');
      applyAlignment(worksheet, `B${employeeStart + 7}`, 'А');
      applyAlignment(worksheet, `B${employeeStart + 8}`, 'К');
      applyAlignment(worksheet, `B${employeeStart + 9}`, 'М');
    } else {
      if (allowAllTypes) {
        const totalDayCell = `B${employeeStart}`;
        const totalNightCell = `B${employeeStart + 1}`;
        const totalOverworkCell = `B${employeeEnd}`;

        worksheet.getCell(totalDayCell).value = 'Итого: дневных';
        worksheet.getCell(totalNightCell).value = 'Итого: ночных';
        worksheet.getCell(totalOverworkCell).value = 'Итого: переработка';

        applyAlignment(worksheet, totalDayCell);
        applyAlignment(worksheet, totalNightCell);
        applyAlignment(worksheet, totalOverworkCell);

        applyAlignment(worksheet, `B${employeeEnd + 1}`, 'П');
        applyAlignment(worksheet, `B${employeeEnd + 2}`, 'Б');
        applyAlignment(worksheet, `B${employeeEnd + 3}`, 'В');
        applyAlignment(worksheet, `B${employeeEnd + 4}`, 'О');
        applyAlignment(worksheet, `B${employeeEnd + 5}`, 'МО');
        applyAlignment(worksheet, `B${employeeEnd + 6}`, 'А');
        applyAlignment(worksheet, `B${employeeEnd + 7}`, 'К');
        applyAlignment(worksheet, `B${employeeEnd + 8}`, 'М');
      } else if (allowDayNight) {
        const totalDayCell = `B${employeeStart}`;
        const totalNightCell = `B${employeeStart + 1}`;

        worksheet.getCell(totalDayCell).value = 'Итого: дневных';
        worksheet.getCell(totalNightCell).value = 'Итого: ночных';
        applyAlignment(worksheet, totalDayCell);
        applyAlignment(worksheet, totalNightCell);

        applyAlignment(worksheet, `B${employeeStart + 2}`, 'П');
        applyAlignment(worksheet, `B${employeeStart + 3}`, 'Б');
        applyAlignment(worksheet, `B${employeeStart + 4}`, 'В');
        applyAlignment(worksheet, `B${employeeStart + 5}`, 'О');
        applyAlignment(worksheet, `B${employeeStart + 6}`, 'МО');
        applyAlignment(worksheet, `B${employeeStart + 7}`, 'А');
        applyAlignment(worksheet, `B${employeeStart + 8}`, 'К');
        applyAlignment(worksheet, `B${employeeStart + 9}`, 'М');
      } else if (allowNightOverwork) {
        const totalNightCell = `B${employeeStart}`;
        const totalOverworkCell = `B${employeeStart + 1}`;

        worksheet.getCell(totalNightCell).value = 'Итого: ночных';
        worksheet.getCell(totalOverworkCell).value = 'Итого: переработка';

        applyAlignment(worksheet, totalNightCell);
        applyAlignment(worksheet, totalOverworkCell);

        applyAlignment(worksheet, `B${employeeStart + 2}`, 'П');
        applyAlignment(worksheet, `B${employeeStart + 3}`, 'Б');
        applyAlignment(worksheet, `B${employeeStart + 4}`, 'В');
        applyAlignment(worksheet, `B${employeeStart + 5}`, 'О');
        applyAlignment(worksheet, `B${employeeStart + 6}`, 'МО');
        applyAlignment(worksheet, `B${employeeStart + 7}`, 'А');
        applyAlignment(worksheet, `B${employeeStart + 8}`, 'К');
        applyAlignment(worksheet, `B${employeeStart + 9}`, 'М');
      } else if (allowDayOverwork) {
        const totalDayCell = `B${employeeStart}`;
        const totalOverworkCell = `B${employeeStart + 1}`;

        worksheet.getCell(totalDayCell).value = 'Итого: дневных';
        worksheet.getCell(totalOverworkCell).value = 'Итого: переработка';

        applyAlignment(worksheet, totalDayCell);
        applyAlignment(worksheet, totalOverworkCell);

        applyAlignment(worksheet, `B${employeeStart + 2}`, 'П');
        applyAlignment(worksheet, `B${employeeStart + 3}`, 'Б');
        applyAlignment(worksheet, `B${employeeStart + 4}`, 'В');
        applyAlignment(worksheet, `B${employeeStart + 5}`, 'О');
        applyAlignment(worksheet, `B${employeeStart + 6}`, 'МО');
        applyAlignment(worksheet, `B${employeeStart + 7}`, 'А');
        applyAlignment(worksheet, `B${employeeStart + 8}`, 'К');
        applyAlignment(worksheet, `B${employeeStart + 9}`, 'М');
      } else if (allowOnlyOverwork) {
        worksheet.getCell(totalSingleCell).value = 'Итого: переработка';
        applyAlignment(worksheet, totalSingleCell);

        applyAlignment(worksheet, `B${employeeStart + 1}`, 'П');
        applyAlignment(worksheet, `B${employeeStart + 2}`, 'Б');
        applyAlignment(worksheet, `B${employeeStart + 3}`, 'В');
        applyAlignment(worksheet, `B${employeeStart + 4}`, 'О');
        applyAlignment(worksheet, `B${employeeStart + 5}`, 'МО');
        applyAlignment(worksheet, `B${employeeStart + 6}`, 'А');
        applyAlignment(worksheet, `B${employeeStart + 7}`, 'К');
        applyAlignment(worksheet, `B${employeeStart + 8}`, 'М');
      } else if (allowOnlyDay) {
        worksheet.getCell(totalSingleCell).value = 'Итого: дневных';
        applyAlignment(worksheet, totalSingleCell);

        applyAlignment(worksheet, `B${employeeStart + 1}`, 'П');
        applyAlignment(worksheet, `B${employeeStart + 2}`, 'Б');
        applyAlignment(worksheet, `B${employeeStart + 3}`, 'В');
        applyAlignment(worksheet, `B${employeeStart + 4}`, 'О');
        applyAlignment(worksheet, `B${employeeStart + 5}`, 'МО');
        applyAlignment(worksheet, `B${employeeStart + 6}`, 'А');
        applyAlignment(worksheet, `B${employeeStart + 7}`, 'К');
        applyAlignment(worksheet, `B${employeeStart + 8}`, 'М');
      } else if (allowOnlyNight) {
        worksheet.getCell(totalSingleCell).value = 'Итого: ночных';
        applyAlignment(worksheet, totalSingleCell);

        applyAlignment(worksheet, `B${employeeStart + 1}`, 'П');
        applyAlignment(worksheet, `B${employeeStart + 2}`, 'Б');
        applyAlignment(worksheet, `B${employeeStart + 3}`, 'В');
        applyAlignment(worksheet, `B${employeeStart + 4}`, 'О');
        applyAlignment(worksheet, `B${employeeStart + 5}`, 'МО');
        applyAlignment(worksheet, `B${employeeStart + 6}`, 'А');
        applyAlignment(worksheet, `B${employeeStart + 7}`, 'К');
        applyAlignment(worksheet, `B${employeeStart + 8}`, 'М');
      }
    }

    let totalStartColumn = 'E';

    const totalOfTotalLetters: Omit<lettersSumType, 'Я'> = {
      А: 0,
      Б: 0,
      В: 0,
      МО: 0,
      О: 0,
      П: 0,
      К: 0,
      М: 0,
    };

    let totalHoursSum: number = 0;

    let totalDayHoursSum: number = 0;
    let totalNightHoursSum: number = 0;
    let totalOverworkHoursSum: number = 0;

    for (let i = 0; i < dates?.length; i++) {
      const day = dates[i];

      if (integers?.allowOnlyTotal) {
        let totalOfTotalCell = 0;

        const cellId = `${totalStartColumn}${employeeStart}:${totalStartColumn}${employeeStart + 1}`;

        const progulCellId = `${totalStartColumn}${employeeStart + 2}`;
        const bolnichCellId = `${totalStartColumn}${employeeStart + 3}`;
        const vihodCellId = `${totalStartColumn}${employeeStart + 4}`;
        const otpushCellId = `${totalStartColumn}${employeeStart + 5}`;
        const mejVahOtpuskCellId = `${totalStartColumn}${employeeStart + 6}`;
        const adminOtpuskCellId = `${totalStartColumn}${employeeStart + 7}`;
        const comandirCellId = `${totalStartColumn}${employeeStart + 8}`;
        const materiCellId = `${totalStartColumn}${employeeStart + 9}`;

        worksheet.mergeCells(cellId);

        const innerTotalOfTotalLetters: Omit<lettersSumType, 'Я'> = {
          А: 0,
          Б: 0,
          В: 0,
          МО: 0,
          О: 0,
          П: 0,
          К: 0,
          М: 0,
        };

        for (let j = 0; j < workLogsData?.length; j++) {
          const element = workLogsData?.[j];
          const newWorkLogs = (element.workDays as never as WorkDaysType)[
            day.fullDate
          ];

          if (typeof newWorkLogs === 'string') {
            innerTotalOfTotalLetters[newWorkLogs] =
              innerTotalOfTotalLetters[newWorkLogs] + 1;
            totalOfTotalLetters[newWorkLogs] =
              totalOfTotalLetters[newWorkLogs] + 1;
          }

          if (typeof newWorkLogs === 'object') {
            totalOfTotalCell += newWorkLogs.total;
            totalHoursSum += newWorkLogs.total;
            // newWorkLogs.overwork;
          }
        }
        applyAlignment(worksheet, cellId, totalOfTotalCell);

        applyAlignment(worksheet, progulCellId, innerTotalOfTotalLetters.П);
        applyAlignment(worksheet, bolnichCellId, innerTotalOfTotalLetters.Б);
        applyAlignment(worksheet, vihodCellId, innerTotalOfTotalLetters.В);
        applyAlignment(worksheet, otpushCellId, innerTotalOfTotalLetters.О);
        applyAlignment(
          worksheet,
          mejVahOtpuskCellId,
          innerTotalOfTotalLetters.МО,
        );
        applyAlignment(
          worksheet,
          adminOtpuskCellId,
          innerTotalOfTotalLetters.А,
        );
        applyAlignment(worksheet, comandirCellId, innerTotalOfTotalLetters.К);
        applyAlignment(worksheet, materiCellId, innerTotalOfTotalLetters.М);
      } else {
        if (allowAllTypes) {
          let totalOfTotalDayCell = 0;
          let totalOfTotalNightCell = 0;
          let totalOfTotalOveroworkCell = 0;

          const dayTargetCellId = `${totalStartColumn}${employeeStart}`;
          const nightTargetCellId = `${totalStartColumn}${employeeStart + 1}`;
          const overworkTargetCellId = `${totalStartColumn}${employeeEnd}`;

          const progulCellId = `${totalStartColumn}${employeeEnd + 1}`;
          const bolnichCellId = `${totalStartColumn}${employeeEnd + 2}`;
          const vihodCellId = `${totalStartColumn}${employeeEnd + 3}`;
          const otpushCellId = `${totalStartColumn}${employeeEnd + 4}`;
          const mejVahOtpuskCellId = `${totalStartColumn}${employeeEnd + 5}`;
          const adminOtpuskCellId = `${totalStartColumn}${employeeEnd + 6}`;
          const comandirCellId = `${totalStartColumn}${employeeEnd + 7}`;
          const materiCellId = `${totalStartColumn}${employeeEnd + 8}`;

          const innerTotalOfTotalLetters: Omit<lettersSumType, 'Я'> = {
            А: 0,
            Б: 0,
            В: 0,
            МО: 0,
            О: 0,
            П: 0,
            К: 0,
            М: 0,
          };

          for (let j = 0; j < workLogsData?.length; j++) {
            const element = workLogsData?.[j];
            const newWorkLogs = (element.workDays as never as WorkDaysType)[
              day.fullDate
            ];

            if (typeof newWorkLogs === 'string') {
              innerTotalOfTotalLetters[newWorkLogs] =
                innerTotalOfTotalLetters[newWorkLogs] + 1;
              totalOfTotalLetters[newWorkLogs] =
                totalOfTotalLetters[newWorkLogs] + 1;
            }

            if (typeof newWorkLogs === 'object') {
              totalDayHoursSum += newWorkLogs.day;
              totalNightHoursSum = newWorkLogs.night;
              totalOverworkHoursSum = newWorkLogs.overwork;

              totalOfTotalDayCell += newWorkLogs.day;
              totalOfTotalNightCell += newWorkLogs.night;
              totalOfTotalOveroworkCell += newWorkLogs.overwork;

              // newWorkLogs.overwork;
            }
          }

          applyAlignment(worksheet, dayTargetCellId, totalOfTotalDayCell);
          applyAlignment(worksheet, nightTargetCellId, totalOfTotalNightCell);
          applyAlignment(
            worksheet,
            overworkTargetCellId,
            totalOfTotalOveroworkCell,
          );

          applyAlignment(worksheet, progulCellId, innerTotalOfTotalLetters.П);
          applyAlignment(worksheet, bolnichCellId, innerTotalOfTotalLetters.Б);
          applyAlignment(worksheet, vihodCellId, innerTotalOfTotalLetters.В);
          applyAlignment(worksheet, otpushCellId, innerTotalOfTotalLetters.О);
          applyAlignment(
            worksheet,
            mejVahOtpuskCellId,
            innerTotalOfTotalLetters.МО,
          );
          applyAlignment(
            worksheet,
            adminOtpuskCellId,
            innerTotalOfTotalLetters.А,
          );
          applyAlignment(worksheet, comandirCellId, innerTotalOfTotalLetters.К);
          applyAlignment(worksheet, materiCellId, innerTotalOfTotalLetters.М);
        } else if (allowNightOverwork || allowDayNight || allowDayOverwork) {
          let firstCellValue = 0;
          let secondCellValue = 0;

          const dayTargetCellId = `${totalStartColumn}${employeeStart}`;
          const nightTargetCellId = `${totalStartColumn}${employeeStart + 1}`;

          const progulCellId = `${totalStartColumn}${employeeStart + 2}`;
          const bolnichCellId = `${totalStartColumn}${employeeStart + 3}`;
          const vihodCellId = `${totalStartColumn}${employeeStart + 4}`;
          const otpushCellId = `${totalStartColumn}${employeeStart + 5}`;
          const mejVahOtpuskCellId = `${totalStartColumn}${employeeStart + 6}`;
          const adminOtpuskCellId = `${totalStartColumn}${employeeStart + 7}`;
          const comandirCellId = `${totalStartColumn}${employeeStart + 8}`;
          const materiCellId = `${totalStartColumn}${employeeStart + 9}`;

          const innerTotalOfTotalLetters: Omit<lettersSumType, 'Я'> = {
            А: 0,
            Б: 0,
            В: 0,
            МО: 0,
            О: 0,
            П: 0,
            К: 0,
            М: 0,
          };

          for (let j = 0; j < workLogsData?.length; j++) {
            const element = workLogsData?.[j];
            const newWorkLogs = (element.workDays as never as WorkDaysType)[
              day.fullDate
            ];

            if (typeof newWorkLogs === 'string') {
              innerTotalOfTotalLetters[newWorkLogs] =
                innerTotalOfTotalLetters[newWorkLogs] + 1;
              totalOfTotalLetters[newWorkLogs] =
                totalOfTotalLetters[newWorkLogs] + 1;
            }

            if (typeof newWorkLogs === 'object') {
              totalDayHoursSum += newWorkLogs?.day;
              totalNightHoursSum = newWorkLogs?.night;
              totalOverworkHoursSum = newWorkLogs?.overwork;

              firstCellValue +=
                allowDayNight || allowDayOverwork
                  ? newWorkLogs?.day
                  : allowDayNight
                    ? newWorkLogs?.night
                    : 0;
              secondCellValue +=
                allowDayOverwork || allowNightOverwork
                  ? +newWorkLogs?.overwork
                  : allowDayNight
                    ? +newWorkLogs?.night
                    : 0;

              // newWorkLogs.overwork;
            }

            applyAlignment(worksheet, dayTargetCellId, firstCellValue);
            applyAlignment(worksheet, nightTargetCellId, secondCellValue);

            applyAlignment(worksheet, progulCellId, innerTotalOfTotalLetters.П);
            applyAlignment(
              worksheet,
              bolnichCellId,
              innerTotalOfTotalLetters.Б,
            );
            applyAlignment(worksheet, vihodCellId, innerTotalOfTotalLetters.В);
            applyAlignment(worksheet, otpushCellId, innerTotalOfTotalLetters.О);
            applyAlignment(
              worksheet,
              mejVahOtpuskCellId,
              innerTotalOfTotalLetters.МО,
            );
            applyAlignment(
              worksheet,
              adminOtpuskCellId,
              innerTotalOfTotalLetters.А,
            );
            applyAlignment(
              worksheet,
              comandirCellId,
              innerTotalOfTotalLetters.К,
            );
            applyAlignment(worksheet, materiCellId, innerTotalOfTotalLetters.М);
          }
        } else if (allowOnlyDay || allowOnlyNight || allowOnlyOverwork) {
          let firstCellValue = 0;

          const firstTargetCellId = `${totalStartColumn}${employeeStart}`;

          const innerTotalOfTotalLetters: Omit<lettersSumType, 'Я'> = {
            А: 0,
            Б: 0,
            В: 0,
            МО: 0,
            О: 0,
            П: 0,
            К: 0,
            М: 0,
          };

          const progulCellId = `${totalStartColumn}${employeeStart + 1}`;
          const bolnichCellId = `${totalStartColumn}${employeeStart + 2}`;
          const vihodCellId = `${totalStartColumn}${employeeStart + 3}`;
          const otpushCellId = `${totalStartColumn}${employeeStart + 4}`;
          const mejVahOtpuskCellId = `${totalStartColumn}${employeeStart + 5}`;
          const adminOtpuskCellId = `${totalStartColumn}${employeeStart + 6}`;
          const comandirCellId = `${totalStartColumn}${employeeStart + 7}`;
          const materiCellId = `${totalStartColumn}${employeeStart + 8}`;

          for (let j = 0; j < workLogsData?.length; j++) {
            const element = workLogsData?.[j];
            const newWorkLogs = (element.workDays as never as WorkDaysType)[
              day.fullDate
            ];

            if (typeof newWorkLogs === 'string') {
              innerTotalOfTotalLetters[newWorkLogs] =
                innerTotalOfTotalLetters[newWorkLogs] + 1;
              totalOfTotalLetters[newWorkLogs] =
                totalOfTotalLetters[newWorkLogs] + 1;
            }

            if (typeof newWorkLogs === 'object') {
              totalDayHoursSum += newWorkLogs.day;
              totalNightHoursSum = newWorkLogs.night;
              totalOverworkHoursSum = newWorkLogs.overwork;

              firstCellValue += allowOnlyDay
                ? newWorkLogs.day
                : allowOnlyNight
                  ? newWorkLogs.night
                  : allowOnlyOverwork
                    ? newWorkLogs.overwork
                    : 0;
            }

            // newWorkLogs.overwork;
          }

          applyAlignment(worksheet, firstTargetCellId, firstCellValue);

          applyAlignment(worksheet, progulCellId, innerTotalOfTotalLetters.П);
          applyAlignment(worksheet, bolnichCellId, innerTotalOfTotalLetters.Б);
          applyAlignment(worksheet, vihodCellId, innerTotalOfTotalLetters.В);
          applyAlignment(worksheet, otpushCellId, innerTotalOfTotalLetters.О);
          applyAlignment(
            worksheet,
            mejVahOtpuskCellId,
            innerTotalOfTotalLetters.МО,
          );
          applyAlignment(
            worksheet,
            adminOtpuskCellId,
            innerTotalOfTotalLetters.А,
          );
          applyAlignment(worksheet, comandirCellId, innerTotalOfTotalLetters.К);
          applyAlignment(worksheet, materiCellId, innerTotalOfTotalLetters.М);
        }
      }

      totalStartColumn = incrementColumn(totalStartColumn);
    }

    const nextTotalColumn = incrementColumn(totalStartColumn);
    const totalTotalSmens = incrementColumn(nextTotalColumn);
    const totalTotalHoursWeekends = incrementColumn(totalTotalSmens);
    const totalTotalSmensWeekends = incrementColumn(totalTotalHoursWeekends);

    const totalTotalProgulWeekends = incrementColumn(totalTotalSmensWeekends);
    const totalTotalBolnickaWeekends = incrementColumn(
      totalTotalProgulWeekends,
    );
    const totalTotalVihodWeekends = incrementColumn(totalTotalBolnickaWeekends);
    const totalTotalOtpuskWeekends = incrementColumn(totalTotalVihodWeekends);
    const totalTotalMejOtpuskWeekends = incrementColumn(
      totalTotalOtpuskWeekends,
    );
    const totalTotalAdminOtpuskWeekends = incrementColumn(
      totalTotalMejOtpuskWeekends,
    );
    const totalTotalComandirWeekends = incrementColumn(
      totalTotalAdminOtpuskWeekends,
    );
    const totalTotalMateriWeekends = incrementColumn(
      totalTotalComandirWeekends,
    );

    if (integers?.allowOnlyTotal) {
      const totalCellId = `${totalStartColumn}${employeeStart}:${nextTotalColumn}${employeeStart + 1}`;

      worksheet.mergeCells(totalCellId);

      setSumWithStep(
        worksheet,
        `${totalStartColumn}${employeeStart}`,
        5,
        employeeStart,
        false,
        2,
      );
    } else {
      if (allowAllTypes) {
        const totalDayHoursCell = `${totalStartColumn}${employeeStart}:${nextTotalColumn}${employeeStart}`;
        const totalNightHoursCell = `${totalStartColumn}${employeeStart + 1}:${nextTotalColumn}${employeeStart + 1}`;
        const totalOverworkFirstHoursCell = `${totalStartColumn}${employeeEnd}`;
        const totalOverworkSecondHoursCell = `${nextTotalColumn}${employeeEnd}`;

        worksheet.mergeCells(totalDayHoursCell);
        worksheet.mergeCells(totalNightHoursCell);

        setSumWithStep(
          worksheet,
          totalDayHoursCell,
          allowAllTypes ? 3 : 5,
          employeeStart,
          false,
          3,
        );
        setSumWithStep(
          worksheet,
          totalNightHoursCell,
          allowAllTypes ? 4 : 6,

          employeeStart,
          false,
          3,
        );
        setSumWithStep(
          worksheet,
          totalOverworkFirstHoursCell,
          allowAllTypes ? 5 : 7,

          employeeStart,
          false,
          3,
        );
        setSumWithStep(
          worksheet,
          totalOverworkSecondHoursCell,
          allowAllTypes ? 5 : 7,

          employeeStart,
          false,
          3,
        );
      } else if (allowDayNight) {
        const totalDayHoursCell = `${totalStartColumn}${employeeStart}:${nextTotalColumn}${employeeStart}`;
        const totalNightHoursCell = `${totalStartColumn}${employeeStart + 1}:${nextTotalColumn}${employeeStart + 1}`;

        worksheet.mergeCells(totalDayHoursCell);
        worksheet.mergeCells(totalNightHoursCell);

        setSumWithStep(
          worksheet,
          totalDayHoursCell,
          5,
          employeeStart,
          false,
          2,
        );
        setSumWithStep(
          worksheet,
          totalNightHoursCell,
          6,
          employeeStart,
          false,
          2,
        );
      } else if (allowNightOverwork || allowDayOverwork) {
        const firstHoursCell = `${totalStartColumn}${employeeStart}:${nextTotalColumn}${employeeStart}`;
        worksheet.mergeCells(firstHoursCell);

        setSumWithStep(worksheet, firstHoursCell, 5, employeeStart, false, 2);

        const totalOverworkFirstHoursCell = `${totalStartColumn}${employeeStart + 1}`;
        const totalOverworkSecondHoursCell = `${nextTotalColumn}${employeeStart + 1}`;
        setSumWithStep(
          worksheet,
          totalOverworkFirstHoursCell,
          6,
          employeeStart,
          false,
          2,
        );
        setSumWithStep(
          worksheet,
          totalOverworkSecondHoursCell,
          6,
          employeeStart,
          false,
          2,
        );
      } else if (allowOnlyDay || allowOnlyNight) {
        const firstHoursCell = `${totalStartColumn}${employeeStart}:${nextTotalColumn}${employeeStart}`;
        worksheet.mergeCells(firstHoursCell);
        setSumWithStep(worksheet, firstHoursCell, 5, employeeStart, false, 2);
      } else if (allowOnlyOverwork) {
        const totalOverworkFirstHoursCell = `${totalStartColumn}${employeeStart}`;
        const totalOverworkSecondHoursCell = `${nextTotalColumn}${employeeStart}`;

        setSumWithStep(
          worksheet,
          totalOverworkFirstHoursCell,
          5,
          employeeStart,
          false,
          1,
        );
        setSumWithStep(
          worksheet,
          totalOverworkSecondHoursCell,
          5,
          employeeStart,
          false,
          1,
        );
      }
    }

    const totalSmensCell = `${totalTotalSmens}${employeeStart}:${totalTotalSmens}${employeeEnd}`;
    const totalWeekendsHoursCell = `${totalTotalHoursWeekends}${employeeStart}:${totalTotalHoursWeekends}${employeeEnd}`;
    const totalWeekendsSmensCell = `${totalTotalSmensWeekends}${employeeStart}:${totalTotalSmensWeekends}${employeeEnd}`;

    const total1 = `${totalTotalProgulWeekends}${employeeStart}:${totalTotalProgulWeekends}${employeeEnd}`;
    const total2 = `${totalTotalBolnickaWeekends}${employeeStart}:${totalTotalBolnickaWeekends}${employeeEnd}`;
    const total3 = `${totalTotalVihodWeekends}${employeeStart}:${totalTotalVihodWeekends}${employeeEnd}`;
    const total4 = `${totalTotalOtpuskWeekends}${employeeStart}:${totalTotalOtpuskWeekends}${employeeEnd}`;
    const total5 = `${totalTotalMejOtpuskWeekends}${employeeStart}:${totalTotalMejOtpuskWeekends}${employeeEnd}`;
    const total6 = `${totalTotalAdminOtpuskWeekends}${employeeStart}:${totalTotalAdminOtpuskWeekends}${employeeEnd}`;
    const total7 = `${totalTotalComandirWeekends}${employeeStart}:${totalTotalComandirWeekends}${employeeEnd}`;
    const total8 = `${totalTotalMateriWeekends}${employeeStart}:${totalTotalMateriWeekends}${employeeEnd}`;

    worksheet.mergeCells(totalSmensCell);
    worksheet.mergeCells(totalWeekendsHoursCell);
    worksheet.mergeCells(totalWeekendsSmensCell);

    worksheet.mergeCells(total1);
    worksheet.mergeCells(total2);
    worksheet.mergeCells(total3);
    worksheet.mergeCells(total4);
    worksheet.mergeCells(total5);
    worksheet.mergeCells(total6);
    worksheet.mergeCells(total7);
    worksheet.mergeCells(total8);

    setSumWithStep(
      worksheet,
      totalSmensCell,
      allowAllTypes ? 3 : 5,
      employeeStart,
      false,
      allowAllTypes ? 3 : 2,
    );
    setSumWithStep(
      worksheet,
      totalWeekendsHoursCell,
      allowAllTypes ? 3 : 5,
      employeeStart,
      false,
      allowAllTypes ? 3 : 2,
    );
    setSumWithStep(
      worksheet,
      totalWeekendsSmensCell,
      allowAllTypes ? 3 : 5,
      employeeStart,
      false,
      allowAllTypes ? 3 : 2,
    );

    applyAlignment(worksheet, total1, totalOfTotalLetters.П);
    applyAlignment(worksheet, total2, totalOfTotalLetters.Б);
    applyAlignment(worksheet, total3, totalOfTotalLetters.В);
    applyAlignment(worksheet, total4, totalOfTotalLetters.О);
    applyAlignment(worksheet, total5, totalOfTotalLetters.МО);
    applyAlignment(worksheet, total6, totalOfTotalLetters.А);
    applyAlignment(worksheet, total7, totalOfTotalLetters.К);
    applyAlignment(worksheet, total8, totalOfTotalLetters.М);

    //                                                                                                                                               Латыпова Н.В.
    const agreedCell = `A${employeeEnd + 10}:U${employeeEnd + 10}`;
    worksheet.mergeCells(agreedCell);
    applyAlignment(
      worksheet,
      agreedCell,
      '  Согласовано генеральный директор ООО "Голд Рекрут"                                                                     /Гаязов И.Ш./',
      // 'Согласовано генеральный директор',
      undefined,
      undefined,
      {
        alignment: {
          horizontal: 'left',
          vertical: 'middle',
        },
        font: {
          bold: true,
          underline: true,
        },
      },
      40,
      employeeEnd + 8,
    );

    const leadingEmployee = `A${employeeEnd + 11}:U${employeeEnd + 11}`;
    worksheet.mergeCells(leadingEmployee);
    applyAlignment(
      worksheet,
      leadingEmployee,
      '  Ведущий специалист  БОТИЗ                                                                                                                                                   Латыпова Н.В.',
      // '  Ведущий специалист  БОТИЗ',
      undefined,
      undefined,
      {
        alignment: {
          horizontal: 'left',
          vertical: 'middle',
        },
        font: {
          bold: true,
          underline: true,
        },
      },
      40,
      employeeEnd + 9,
    );

    const directorCell = `A${employeeEnd + 13}:U${employeeEnd + 13}`;
    worksheet.mergeCells(directorCell);
    applyAlignment(
      worksheet,
      directorCell,
      '  Руководитель                                                                                         /Мидонов А.Ю/',
      // '  Руководитель',
      undefined,
      undefined,
      {
        alignment: {
          horizontal: 'left',
          vertical: 'middle',
        },
        font: {
          bold: true,
          underline: true,
        },
      },
      40,
      employeeEnd + 10,
    );

    const nachanlnikCell = `A${employeeEnd + 15}:U${employeeEnd + 15}`;
    worksheet.mergeCells(nachanlnikCell);
    applyAlignment(
      worksheet,
      nachanlnikCell,
      '  Начальник ОК                                                                                          /Пахалина Ю.А./',
      // '  Начальник ОК',
      undefined,
      undefined,
      {
        alignment: {
          horizontal: 'left',
          vertical: 'middle',
        },
        font: {
          bold: true,
          underline: true,
        },
      },
      40,
      employeeEnd + 11,
    );

    const startCell = 'A5';

    const endRow = worksheet.rowCount;
    const endColumn = worksheet.columns.length;

    const endColumnLetter = getExcelColumnName(endColumn);
    const endCell = `${endColumnLetter}${endRow}`;

    worksheet.autoFilter = {
      from: startCell,
      to: endCell,
    };

    const stream = new PassThrough();
    await workbook.xlsx.write(stream);
    stream.end();

    return new StreamableFile(stream);
  }

  async downloadAllFacilities(date: string) {
    validateParamsDate(date);

    const targetDate = dayjs(date, 'MM-YYYY');
    const currentDate = dayjs();

    const monthDifference = targetDate.diff(currentDate, 'month');

    const dates = getDaysInMonth(monthDifference);

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Таблица');

    workbook.creator = 'admin';
    workbook.lastModifiedBy = 'admin';
    workbook.created = new Date();
    workbook.modified = new Date();

    const allFacilities = await this.facilitiesModel.findAll({
      order: [['id', 'asc']],
      include: {
        model: MasterFacilities,
        attributes: ['master_id'],
        include: [
          {
            model: User,
            attributes: ['lastName', 'firstName', 'middleName', 'phoneNumber'],
          },
        ],
      },
    });

    worksheet.columns = [{ header: 'Объект', width: 25 }];

    let startColumn = 'C';

    for (let i = 0; i < dates?.length; i++) {
      const day = dates[i];
      const isWeekend = day.isWeekend;

      const dayCell = `${startColumn}1`;
      const dayNameCell = `${startColumn}2`;

      worksheet.getCell(dayCell).value = day.date;
      worksheet.getCell(dayNameCell).value = day.dayName;

      worksheet.mergeCells(dayCell);
      worksheet.mergeCells(dayNameCell);

      applyAlignment(
        worksheet,
        dayCell,
        undefined,
        undefined,
        isWeekend ? true : false,
      );

      applyAlignment(
        worksheet,
        dayNameCell,
        undefined,
        undefined,
        isWeekend ? true : false,
      );

      const upperCell = worksheet.getCell(`${startColumn}1`);
      const bottomCell = worksheet.getCell(`${startColumn}2`);

      upperCell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      bottomCell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      startColumn = incrementColumn(startColumn);
    }

    const nextColumn = incrementColumn(startColumn);
    const totalSmens = incrementColumn(nextColumn);
    const totalHoursWeekends = incrementColumn(totalSmens);
    const totalSmensWeekends = incrementColumn(totalHoursWeekends);

    const progulColumn = incrementColumn(totalSmensWeekends);
    const bolnichnColumn = incrementColumn(progulColumn);
    const vihodColumn = incrementColumn(bolnichnColumn);
    const otpuskColumn = incrementColumn(vihodColumn);
    const mejOtpuskColumn = incrementColumn(otpuskColumn);
    const adminColumn = incrementColumn(mejOtpuskColumn);

    const totalHours = `${startColumn}1:${nextColumn}2`;
    const totalSmensRow = `${totalSmens}1:${totalSmens}2`;
    const totalHoursSecondRow = `${totalHoursWeekends}1:${totalHoursWeekends}2`;
    const totalSmensWeekendsRow = `${totalSmensWeekends}1:${totalSmensWeekends}2`;

    const totalProgulRow = `${progulColumn}1:${progulColumn}2`;
    const totalBolnichRow = `${bolnichnColumn}1:${bolnichnColumn}2`;
    const totalVihodRow = `${vihodColumn}1:${vihodColumn}2`;
    const totalOtpuskRow = `${otpuskColumn}1:${otpuskColumn}2`;
    const totalMejOtpuskRow = `${mejOtpuskColumn}1:${mejOtpuskColumn}2`;
    const totalAdminColumnRow = `${adminColumn}1:${adminColumn}2`;

    worksheet.mergeCells(totalHours);
    worksheet.mergeCells(totalSmensRow);
    worksheet.mergeCells(totalHoursSecondRow);
    worksheet.mergeCells(totalSmensWeekendsRow);

    worksheet.mergeCells(totalProgulRow);
    worksheet.mergeCells(totalBolnichRow);
    worksheet.mergeCells(totalVihodRow);
    worksheet.mergeCells(totalOtpuskRow);
    worksheet.mergeCells(totalMejOtpuskRow);
    worksheet.mergeCells(totalAdminColumnRow);

    applyAlignment(worksheet, totalHours, 'Итоги');
    applyAlignment(worksheet, totalSmensRow + 1, 'Итого смен', 20);
    applyAlignment(worksheet, totalHoursSecondRow + 1, 'Итого часов (вых)', 20);
    applyAlignment(
      worksheet,
      totalSmensWeekendsRow + 1,
      'Итого смен (вых)',
      20,
    );

    applyAlignment(worksheet, totalProgulRow, 'П');
    applyAlignment(worksheet, totalBolnichRow, 'Б');
    applyAlignment(worksheet, totalVihodRow, 'В');
    applyAlignment(worksheet, totalOtpuskRow, 'О');
    applyAlignment(worksheet, totalMejOtpuskRow, 'МО');
    applyAlignment(worksheet, totalAdminColumnRow, 'А');

    let startCell = 'A3';

    if (allFacilities?.length) {
      const firstIntegers = allFacilities?.[0]?.settings?.integers;

      let facilityStart = 3;
      let facilityEnd = firstIntegers.allowOnlyTotal
        ? 3
        : firstIntegers.allowDay &&
            firstIntegers.allowNight &&
            firstIntegers.allowOverwork
          ? 5
          : (firstIntegers?.allowDay && firstIntegers?.allowNight) ||
              (firstIntegers?.allowDay && firstIntegers?.allowOverwork) ||
              (firstIntegers?.allowNight && firstIntegers?.allowOverwork)
            ? 4
            : 3;

      const allTotalsObject: Record<
        string,
        {
          day: number;
          night: number;
          overwork: number;
          onlyTotal: number;
          А: number;
          Б: number;
          В: number;
          МО: number;
          О: number;
          П: number;
        }
      > = {};

      const allTotalsTotalObject: {
        onlyTotalHours: number;
        totalDayHours: number;
        totalNightHours: number;
        totalOverworkFirstPartHours: number;
        totalOverworkSecondPartHours: number;
        totalSmensCount: number;
        allWeekenedHours: number;
        allWeekendSmensCount: number;
        А: number;
        Б: number;
        В: number;
        МО: number;
        О: number;
        П: number;
        К: number;
        М: number;
      } = {
        onlyTotalHours: 0,
        totalDayHours: 0,
        totalNightHours: 0,
        totalOverworkFirstPartHours: 0,
        totalOverworkSecondPartHours: 0,
        totalSmensCount: 0,
        allWeekenedHours: 0,
        allWeekendSmensCount: 0,
        А: 0,
        Б: 0,
        В: 0,
        МО: 0,
        О: 0,
        П: 0,
        К: 0,
        М: 0,
      };

      for (let i = 0; i < allFacilities?.length; i++) {
        const facility = allFacilities[i];

        const facilityId = facility?.id;

        const allowedEmployees = await this.employeeService.findByFacilityId(
          facilityId,
          date,
        );
        const workLogsData = await this.findByDate(date, facilityId);

        const integers = facility?.settings?.integers;

        const allowOnlyTotal = integers?.allowOnlyTotal;

        const allowAllTypes =
          integers?.allowDay && integers?.allowNight && integers?.allowOverwork;

        const allowDayNight =
          integers?.allowDay &&
          integers?.allowNight &&
          !integers?.allowOverwork;
        const allowDayOverwork =
          integers?.allowDay &&
          !integers?.allowNight &&
          integers?.allowOverwork;
        const allowNightOverwork =
          !integers?.allowDay &&
          integers?.allowNight &&
          integers?.allowOverwork;

        const allowOnlyDay =
          integers?.allowDay &&
          !integers?.allowNight &&
          !integers?.allowOverwork;
        const allowOnlyNight =
          !integers?.allowDay &&
          integers?.allowNight &&
          !integers?.allowOverwork;
        const allowOnlyOverwork =
          !integers?.allowDay &&
          !integers?.allowNight &&
          integers?.allowOverwork;

        if (integers.allowOnlyTotal) {
          const cell = `B${facilityStart}`;

          const facilityNameCell = `A${facilityStart}`;
          worksheet.mergeCells(facilityNameCell);

          applyAlignment(worksheet, facilityNameCell, facility.name);

          worksheet.getCell(cell).value = 'Часы';
          worksheet.mergeCells(cell);
          applyAlignment(worksheet, cell);
        } else {
          if (
            integers.allowDay &&
            integers.allowNight &&
            integers.allowOverwork
          ) {
            const dayCell = `B${facilityStart}`;
            const nightCell = `B${facilityStart + 1}`;
            const overworkCell = `B${facilityStart + 2}`;

            const facilityNameCell = `A${facilityStart}:A${facilityStart + 2}`;
            worksheet.mergeCells(facilityNameCell);
            applyAlignment(worksheet, facilityNameCell, facility.name);

            worksheet.getCell(dayCell).value = 'д';
            worksheet.getCell(nightCell).value = 'н';
            worksheet.getCell(overworkCell).value = 'п';

            applyAlignment(worksheet, dayCell);
            applyAlignment(worksheet, nightCell);
            applyAlignment(worksheet, overworkCell);
          } else if (
            integers.allowDay &&
            integers.allowNight &&
            !integers.allowOverwork
          ) {
            const dayCell = `B${facilityStart}`;
            const nightCell = `B${facilityStart + 1}`;

            const facilityNameCell = `A${facilityStart}:A${facilityStart + 1}`;
            worksheet.mergeCells(facilityNameCell);
            applyAlignment(worksheet, facilityNameCell, facility.name);

            worksheet.getCell(dayCell).value = 'д';
            worksheet.getCell(nightCell).value = 'н'; // Указываем начальную ячейку

            worksheet.mergeCells(nightCell);

            applyAlignment(worksheet, dayCell);
            applyAlignment(worksheet, nightCell);
          } else if (
            integers.allowDay &&
            !integers.allowNight &&
            integers.allowOverwork
          ) {
            const dayCell = `B${facilityStart}`;
            const overworkCell = `B${facilityStart + 1}`;

            const facilityNameCell = `A${facilityStart}:A${facilityStart + 1}`;
            worksheet.mergeCells(facilityNameCell);
            applyAlignment(worksheet, facilityNameCell, facility.name);

            worksheet.getCell(dayCell).value = 'д';
            worksheet.getCell(overworkCell).value = 'п'; // Указываем начальную ячейку

            worksheet.mergeCells(overworkCell);

            applyAlignment(worksheet, dayCell);
            applyAlignment(worksheet, overworkCell);
          } else if (
            !integers.allowDay &&
            integers.allowNight &&
            integers.allowOverwork
          ) {
            const nightCell = `B${facilityStart}`;
            const overworkCell = `B${facilityStart + 1}`;

            const facilityNameCell = `A${facilityStart}:A${facilityStart + 1}`;
            worksheet.mergeCells(facilityNameCell);
            applyAlignment(worksheet, facilityNameCell, facility.name);

            worksheet.getCell(nightCell).value = 'н';
            worksheet.getCell(overworkCell).value = 'п'; // Указываем начальную ячейку

            worksheet.mergeCells(overworkCell);

            applyAlignment(worksheet, nightCell);
            applyAlignment(worksheet, overworkCell);
          } else if (
            integers.allowDay &&
            !integers.allowNight &&
            !integers.allowOverwork
          ) {
            const dayCell = `B${facilityStart}`;

            const facilityNameCell = `A${facilityStart}`;
            worksheet.mergeCells(facilityNameCell);
            applyAlignment(worksheet, facilityNameCell, facility.name);

            worksheet.getCell(dayCell).value = 'д';

            worksheet.mergeCells(dayCell);

            applyAlignment(worksheet, dayCell);
          } else if (
            !integers.allowDay &&
            integers.allowNight &&
            !integers.allowOverwork
          ) {
            const nightCell = `B${facilityStart}`;

            worksheet.getCell(nightCell).value = 'н';
            worksheet.mergeCells(nightCell);
            applyAlignment(worksheet, nightCell);

            const facilityNameCell = `A${facilityStart}`;
            worksheet.mergeCells(facilityNameCell);
            applyAlignment(worksheet, facilityNameCell, facility.name);
          } else if (
            !integers.allowDay &&
            !integers.allowNight &&
            integers.allowOverwork
          ) {
            const overworkCell = `B${facilityStart}`;

            worksheet.getCell(overworkCell).value = 'п';

            worksheet.mergeCells(overworkCell);

            applyAlignment(worksheet, overworkCell);

            const facilityNameCell = `A${facilityStart}`;
            worksheet.mergeCells(facilityNameCell);
            applyAlignment(worksheet, facilityNameCell, facility.name);
          }
        }

        let totalOnlyHours: number = 0;
        let totalDayHours: number = 0;
        let totalNightHours: number = 0;
        let overworkFirstPart: number = 0;
        let overworkSecondPart: number = 0;
        let totalSmensCount: number = 0;
        let totalWeekendsHours: number = 0;
        let totalWeekendSmensCount: number = 0;

        const totalLetters: Omit<lettersSumType, 'Я'> = {
          А: 0,
          Б: 0,
          В: 0,
          МО: 0,
          О: 0,
          П: 0,
          К: 0,
          М: 0,
        };

        let columnIdForTotalStart: string = '';

        for (let j = 0; j < allowedEmployees?.length; j++) {
          let startColumn = 'C';

          const employee = allowedEmployees[j];

          for (let k = 0; k < dates?.length; k++) {
            const day = dates[k];
            const isWeekend = day.isWeekend;

            const sumAtTotal: number[] = [];
            const sumAtDay: number[] = [];
            const sumAtNight: number[] = [];
            const sumAtOverwork: number[] = [];

            const innerTotalOfTotalLetters: Omit<lettersSumType, 'Я'> = {
              А: 0,
              Б: 0,
              В: 0,
              МО: 0,
              О: 0,
              П: 0,
              К: 0,
              М: 0,
            };

            for (let n = 0; n < workLogsData?.length; n++) {
              const workLog = workLogsData?.[n];

              const workDays = workLog?.workDays;
              const workDayValue = workLog?.workDays?.[
                day.fullDate
              ] as cellValueType;

              const dayValue = +(workDayValue?.day ?? 0);
              const nightValue = +(workDayValue?.night ?? 0);
              const overoworkValue = +(workDayValue?.overwork ?? 0);
              const totalValue = +(workDayValue?.total ?? 0);

              const isCurrentEmployee = workLog?.employee?.id === employee?.id;

              if (isCurrentEmployee) {
                if (typeof workDayValue === 'string') {
                  //@ts-ignore
                  totalLetters[workDayValue] += 1;
                  //@ts-ignore
                  innerTotalOfTotalLetters[workDayValue] += 1;
                }
              }

              if (typeof workDayValue === 'object') {
                if (allowOnlyTotal) {
                  sumAtTotal.push(totalValue);

                  if (isCurrentEmployee) {
                    if (totalValue && !isWeekend) {
                      totalOnlyHours += totalValue;

                      totalSmensCount += 1;
                    } else if (totalValue && isWeekend) {
                      totalWeekendsHours += totalValue;
                      totalWeekendSmensCount += 1;
                    }
                  }
                } else {
                  if (allowAllTypes) {
                    if (isCurrentEmployee) {
                      if (dayValue && !isWeekend) {
                        totalDayHours += dayValue;
                      } else if (dayValue && isWeekend) {
                        totalWeekendsHours += dayValue;
                      }

                      if (nightValue && !isWeekend) {
                        totalNightHours += nightValue;
                      } else if (nightValue && isWeekend) {
                        totalWeekendsHours += nightValue;
                      }

                      if ((dayValue || nightValue) && !isWeekend) {
                        totalSmensCount += 1;
                      }

                      if ((dayValue || nightValue) && isWeekend) {
                        totalWeekendSmensCount += 1;
                      }

                      if (overoworkValue && !isWeekend) {
                        if (overoworkValue <= 2) {
                          overworkFirstPart += overoworkValue;
                        }
                        if (overoworkValue > 2) {
                          overworkFirstPart += 2;
                          overworkSecondPart += overoworkValue - 2;
                        }
                      }
                    }

                    sumAtDay.push(dayValue);
                    sumAtNight.push(nightValue);
                    sumAtOverwork.push(overoworkValue);
                  } else if (allowDayNight) {
                    if (isCurrentEmployee) {
                      if (dayValue && !isWeekend) {
                        totalDayHours += dayValue;
                      } else if (dayValue && isWeekend) {
                        totalWeekendsHours += dayValue;
                      }

                      if (nightValue && !isWeekend) {
                        totalNightHours += nightValue;
                      } else if (nightValue && isWeekend) {
                        totalWeekendsHours += nightValue;
                      }

                      if ((dayValue || nightValue) && !isWeekend) {
                        totalSmensCount += 1;
                      }

                      if ((dayValue || nightValue) && isWeekend) {
                        totalWeekendSmensCount += 1;
                      }
                    }

                    sumAtDay.push(dayValue);
                    sumAtNight.push(nightValue);
                  } else if (allowDayOverwork) {
                    if (isCurrentEmployee) {
                      if (dayValue && !isWeekend) {
                        totalDayHours += dayValue;
                        totalSmensCount += 1;
                      } else if (dayValue && isWeekend) {
                        totalWeekendsHours += dayValue;
                        totalWeekendSmensCount += 1;
                      }

                      if (overoworkValue && !isWeekend) {
                        if (overoworkValue <= 2) {
                          overworkFirstPart += overoworkValue;
                        }
                        if (overoworkValue > 2) {
                          overworkFirstPart += 2;
                          overworkSecondPart += overoworkValue - 2;
                        }
                      }
                    }

                    sumAtDay.push(dayValue);
                    sumAtOverwork.push(overoworkValue);
                  } else if (allowNightOverwork) {
                    if (isCurrentEmployee) {
                      if (nightValue && !isWeekend) {
                        totalNightHours += nightValue;
                      } else if (nightValue && isWeekend) {
                        totalWeekendsHours += nightValue;
                      }

                      if (nightValue && !isWeekend) {
                        totalSmensCount += 1;
                      }

                      if (nightValue && isWeekend) {
                        totalWeekendSmensCount += 1;
                      }

                      if (overoworkValue && !isWeekend) {
                        if (overoworkValue <= 2) {
                          overworkFirstPart += overoworkValue;
                        }
                        if (overoworkValue > 2) {
                          overworkFirstPart += 2;
                          overworkSecondPart += overoworkValue - 2;
                        }
                      }
                    }

                    sumAtNight.push(nightValue);
                    sumAtOverwork.push(overoworkValue);
                  } else if (allowOnlyDay) {
                    if (isCurrentEmployee) {
                      if (dayValue && !isWeekend) {
                        totalDayHours += dayValue;
                      } else if (dayValue && isWeekend) {
                        totalWeekendsHours += dayValue;
                      }

                      if (dayValue && !isWeekend) {
                        totalSmensCount += 1;
                      }

                      if (dayValue && isWeekend) {
                        totalWeekendSmensCount += 1;
                      }
                    }

                    sumAtDay.push(dayValue);
                  } else if (allowOnlyNight) {
                    if (isCurrentEmployee) {
                      if (nightValue && !isWeekend) {
                        totalNightHours += nightValue;
                      } else if (nightValue && isWeekend) {
                        totalWeekendsHours += nightValue;
                      }

                      if (nightValue && !isWeekend) {
                        totalSmensCount += 1;
                      }

                      if (nightValue && isWeekend) {
                        totalWeekendSmensCount += 1;
                      }
                    }

                    sumAtNight.push(nightValue);
                  } else if (allowOnlyOverwork) {
                    if (isCurrentEmployee) {
                      if (overoworkValue && !isWeekend) {
                        if (overoworkValue <= 2) {
                          overworkFirstPart += overoworkValue;
                        }
                        if (overoworkValue > 2) {
                          overworkFirstPart += 2;
                          overworkSecondPart += overoworkValue - 2;
                        }
                      }
                    }

                    sumAtOverwork.push(overoworkValue);
                  }
                }
              }
            }

            allTotalsObject[day.fullDate] = {
              ...allTotalsObject[day.fullDate],
              П: innerTotalOfTotalLetters?.П ?? 0,
              Б: innerTotalOfTotalLetters?.Б ?? 0,
              В: innerTotalOfTotalLetters?.В ?? 0,
              О: innerTotalOfTotalLetters?.О ?? 0,
              МО: innerTotalOfTotalLetters?.МО ?? 0,
              А: innerTotalOfTotalLetters?.А ?? 0,
            };

            if (allowOnlyTotal) {
              const allTypesCell = `${startColumn}${facilityStart}`;
              const sum = sumAtTotal?.reduce((prev, curr) => prev + curr, 0);
              applyAlignment(
                worksheet,
                allTypesCell,
                sum,
                undefined,
                isWeekend,
              );
              if (j === allowedEmployees?.length - 1) {
                if (allTotalsObject?.[day.fullDate]?.onlyTotal) {
                  allTotalsObject[day.fullDate].onlyTotal += sum;
                } else {
                  allTotalsObject[day.fullDate] = {
                    ...allTotalsObject[day.fullDate],
                    onlyTotal: sum,
                  };
                }
              }
            } else {
              const sumOfDays = sumAtDay?.reduce(
                (prev, curr) => prev + curr,
                0,
              );
              const sumOfNight = sumAtNight?.reduce(
                (prev, curr) => prev + curr,
                0,
              );
              const sumOfOverwork = sumAtOverwork?.reduce(
                (prev, curr) => prev + curr,
                0,
              );
              if (j === allowedEmployees?.length - 1) {
                if (allTotalsObject?.[day.fullDate]?.day) {
                  allTotalsObject[day.fullDate].day += sumOfDays;
                } else {
                  allTotalsObject[day.fullDate] = {
                    ...allTotalsObject[day.fullDate],
                    day: sumOfDays,
                  };
                }

                if (allTotalsObject?.[day.fullDate]?.night) {
                  allTotalsObject[day.fullDate].night += sumOfNight;
                } else {
                  allTotalsObject[day.fullDate] = {
                    ...allTotalsObject[day.fullDate],
                    night: sumOfNight,
                  };
                }

                if (allTotalsObject?.[day.fullDate]?.overwork) {
                  allTotalsObject[day.fullDate].overwork += sumOfOverwork;
                } else {
                  allTotalsObject[day.fullDate] = {
                    ...allTotalsObject[day.fullDate],
                    overwork: sumOfOverwork,
                  };
                }
              }

              const dayCell = `${startColumn}${facilityStart}`;
              const nightCell = `${startColumn}${facilityStart + (allowAllTypes || allowDayNight ? 1 : 0)}`;
              const overworkCell = `${startColumn}${facilityStart + (allowAllTypes ? 2 : allowOnlyOverwork ? 0 : 1)}`;

              if (allowAllTypes) {
                worksheet.getCell(dayCell).value = sumOfDays;
                worksheet.getCell(nightCell).value = sumOfNight;
                worksheet.getCell(overworkCell).value = sumOfOverwork;

                applyAlignment(
                  worksheet,
                  dayCell,
                  undefined,
                  undefined,
                  isWeekend,
                );
                applyAlignment(
                  worksheet,
                  nightCell,
                  undefined,
                  undefined,
                  isWeekend,
                );
                applyAlignment(
                  worksheet,
                  overworkCell,
                  undefined,
                  undefined,
                  isWeekend,
                );
              } else {
                if (allowDayNight) {
                  worksheet.getCell(dayCell).value = sumOfDays;
                  worksheet.getCell(nightCell).value = sumOfNight;
                  applyAlignment(
                    worksheet,
                    dayCell,
                    undefined,
                    undefined,
                    isWeekend,
                  );
                  applyAlignment(
                    worksheet,
                    nightCell,
                    undefined,
                    undefined,
                    isWeekend,
                  );
                } else if (allowDayOverwork) {
                  worksheet.getCell(dayCell).value = sumOfDays;
                  worksheet.getCell(overworkCell).value = sumOfOverwork;
                  applyAlignment(
                    worksheet,
                    dayCell,
                    undefined,
                    undefined,
                    isWeekend,
                  );
                  applyAlignment(
                    worksheet,
                    overworkCell,
                    undefined,
                    undefined,
                    isWeekend,
                  );
                } else if (allowNightOverwork) {
                  worksheet.getCell(nightCell).value = sumOfNight;
                  worksheet.getCell(overworkCell).value = sumOfOverwork;
                  applyAlignment(
                    worksheet,
                    nightCell,
                    undefined,
                    undefined,
                    isWeekend,
                  );
                  applyAlignment(
                    worksheet,
                    overworkCell,
                    undefined,
                    undefined,
                    isWeekend,
                  );
                } else if (allowOnlyDay) {
                  worksheet.getCell(dayCell).value = sumOfDays;
                  applyAlignment(
                    worksheet,
                    dayCell,
                    undefined,
                    undefined,
                    isWeekend,
                  );
                } else if (allowOnlyNight) {
                  worksheet.getCell(nightCell).value = sumOfNight;
                  applyAlignment(
                    worksheet,
                    nightCell,
                    undefined,
                    undefined,
                    isWeekend,
                  );
                } else if (allowOnlyOverwork) {
                  worksheet.getCell(overworkCell).value = sumOfOverwork;
                  applyAlignment(
                    worksheet,
                    overworkCell,
                    undefined,
                    undefined,
                    isWeekend,
                  );
                }
              }
            }

            if (k === dates?.length - 1) {
              columnIdForTotalStart = incrementColumn(startColumn);
            }
            startColumn = incrementColumn(startColumn);
          }
        }

        if (columnIdForTotalStart) {
          const nextColumn = incrementColumn(columnIdForTotalStart);

          const nextColumnIndex =
            facilityStart +
            (allowOnlyTotal
              ? 0
              : allowAllTypes
                ? 2
                : allowDayNight || allowDayOverwork || allowNightOverwork
                  ? 1
                  : 0);

          const totalSmens = incrementColumn(nextColumn);
          const totalHoursWeekends = incrementColumn(totalSmens);
          const totalSmensWeekends = incrementColumn(totalHoursWeekends);

          const total1 = incrementColumn(totalSmensWeekends);
          const total2 = incrementColumn(total1);
          const total3 = incrementColumn(total2);
          const total4 = incrementColumn(total3);
          const total5 = incrementColumn(total4);
          const total6 = incrementColumn(total5);

          // worksheet.mergeCells(totalHours);

          if (allowOnlyTotal) {
            const totalHours = `${columnIdForTotalStart}${facilityStart}:${nextColumn}${nextColumnIndex}`;
            worksheet.mergeCells(totalHours);
            applyAlignment(worksheet, totalHours, totalOnlyHours);

            allTotalsTotalObject.onlyTotalHours += totalOnlyHours;
          } else {
            if (allowAllTypes) {
              const dayCell = `${columnIdForTotalStart}${facilityStart}:${nextColumn}${facilityStart}`;
              const nightCell = `${columnIdForTotalStart}${facilityStart + 1}:${nextColumn}${facilityStart + 1}`;

              worksheet.mergeCells(dayCell);
              worksheet.mergeCells(nightCell);

              applyAlignment(worksheet, dayCell, totalDayHours);
              applyAlignment(worksheet, nightCell, totalNightHours);

              allTotalsTotalObject.totalDayHours += totalDayHours;
              allTotalsTotalObject.totalNightHours += totalNightHours;

              const overworkFirstCell = `${columnIdForTotalStart}${facilityStart + 2}`;
              const overworkSecondCell = `${nextColumn}${facilityStart + 2}`;

              applyAlignment(worksheet, overworkFirstCell, overworkFirstPart);
              applyAlignment(worksheet, overworkSecondCell, overworkSecondPart);

              allTotalsTotalObject.totalOverworkFirstPartHours +=
                overworkFirstPart;
              allTotalsTotalObject.totalOverworkSecondPartHours +=
                overworkSecondPart;
            } else if (allowDayNight) {
              const dayCell = `${columnIdForTotalStart}${facilityStart}:${nextColumn}${facilityStart}`;
              const nightCell = `${columnIdForTotalStart}${facilityStart + 1}:${nextColumn}${facilityStart + 1}`;

              worksheet.mergeCells(dayCell);
              worksheet.mergeCells(nightCell);

              applyAlignment(worksheet, dayCell, totalDayHours);
              applyAlignment(worksheet, nightCell, totalNightHours);

              allTotalsTotalObject.totalDayHours += totalDayHours;
              allTotalsTotalObject.totalNightHours += totalNightHours;
            } else if (allowDayOverwork) {
              const dayCell = `${columnIdForTotalStart}${facilityStart}:${nextColumn}${facilityStart}`;
              worksheet.mergeCells(dayCell);
              applyAlignment(worksheet, dayCell, totalDayHours);

              const overworkFirstCell = `${columnIdForTotalStart}${facilityStart + 1}`;
              const overworkSecondCell = `${nextColumn}${facilityStart + 1}`;

              applyAlignment(worksheet, overworkFirstCell, overworkFirstPart);
              applyAlignment(worksheet, overworkSecondCell, overworkSecondPart);

              allTotalsTotalObject.totalDayHours += totalDayHours;

              allTotalsTotalObject.totalOverworkFirstPartHours +=
                overworkFirstPart;
              allTotalsTotalObject.totalOverworkSecondPartHours +=
                overworkSecondPart;
            } else if (allowNightOverwork) {
              const nightCell = `${columnIdForTotalStart}${facilityStart}:${nextColumn}${facilityStart}`;
              worksheet.mergeCells(nightCell);
              applyAlignment(worksheet, nightCell, totalNightHours);

              const overworkFirstCell = `${columnIdForTotalStart}${facilityStart + 1}`;
              const overworkSecondCell = `${nextColumn}${facilityStart + 1}`;

              applyAlignment(worksheet, overworkFirstCell, overworkFirstPart);
              applyAlignment(worksheet, overworkSecondCell, overworkSecondPart);

              allTotalsTotalObject.totalNightHours += totalNightHours;
              allTotalsTotalObject.totalOverworkFirstPartHours +=
                overworkFirstPart;
              allTotalsTotalObject.totalOverworkSecondPartHours +=
                overworkSecondPart;
            } else if (allowOnlyDay) {
              const dayCell = `${columnIdForTotalStart}${facilityStart}:${nextColumn}${facilityStart}`;
              worksheet.mergeCells(dayCell);
              applyAlignment(worksheet, dayCell, totalDayHours);

              allTotalsTotalObject.totalDayHours += totalDayHours;
            } else if (allowOnlyNight) {
              const nightCell = `${columnIdForTotalStart}${facilityStart}:${nextColumn}${facilityStart}`;
              worksheet.mergeCells(nightCell);
              applyAlignment(worksheet, nightCell, totalNightHours);

              allTotalsTotalObject.totalNightHours += totalNightHours;
            } else if (allowOnlyOverwork) {
              const overworkFirstCell = `${columnIdForTotalStart}${facilityStart}`;
              const overworkSecondCell = `${nextColumn}${facilityStart}`;

              applyAlignment(worksheet, overworkFirstCell, overworkFirstPart);
              applyAlignment(worksheet, overworkSecondCell, overworkSecondPart);

              allTotalsTotalObject.totalOverworkFirstPartHours +=
                overworkFirstPart;
              allTotalsTotalObject.totalOverworkSecondPartHours +=
                overworkSecondPart;
            }
          }

          worksheet.mergeCells(
            `${totalSmens}${facilityStart}:${totalSmens}${nextColumnIndex}`,
          );
          worksheet.mergeCells(
            `${totalHoursWeekends}${facilityStart}:${totalHoursWeekends}${nextColumnIndex}`,
          );
          worksheet.mergeCells(
            `${totalSmensWeekends}${facilityStart}:${totalSmensWeekends}${nextColumnIndex}`,
          );

          worksheet.mergeCells(
            `${total1}${facilityStart}:${total1}${nextColumnIndex}`,
          );
          worksheet.mergeCells(
            `${total2}${facilityStart}:${total2}${nextColumnIndex}`,
          );
          worksheet.mergeCells(
            `${total3}${facilityStart}:${total3}${nextColumnIndex}`,
          );
          worksheet.mergeCells(
            `${total4}${facilityStart}:${total4}${nextColumnIndex}`,
          );
          worksheet.mergeCells(
            `${total5}${facilityStart}:${total5}${nextColumnIndex}`,
          );
          worksheet.mergeCells(
            `${total6}${facilityStart}:${total6}${nextColumnIndex}`,
          );

          applyAlignment(
            worksheet,
            `${totalSmens}${facilityStart}:${totalSmens}${facilityEnd}`,
            totalSmensCount,
          );
          applyAlignment(
            worksheet,
            `${totalHoursWeekends}${facilityStart}:${totalHoursWeekends}${facilityEnd}`,
            totalWeekendsHours,
          );
          applyAlignment(
            worksheet,
            `${totalSmensWeekends}${facilityStart}:${totalSmensWeekends}${facilityEnd}`,
            totalWeekendSmensCount,
          );

          applyAlignment(
            worksheet,
            `${total1}${facilityStart}:${total1}${facilityEnd}`,
            totalLetters.П,
          );
          applyAlignment(
            worksheet,
            `${total2}${facilityStart}:${total2}${facilityEnd}`,
            totalLetters.Б,
          );
          applyAlignment(
            worksheet,
            `${total3}${facilityStart}:${total3}${facilityEnd}`,
            totalLetters.В,
          );
          applyAlignment(
            worksheet,
            `${total4}${facilityStart}:${total4}${facilityEnd}`,
            totalLetters.О,
          );
          applyAlignment(
            worksheet,
            `${total5}${facilityStart}:${total5}${facilityEnd}`,
            totalLetters.МО,
          );
          applyAlignment(
            worksheet,
            `${total6}${facilityStart}:${total6}${facilityEnd}`,
            totalLetters.А,
          );

          allTotalsTotalObject.totalSmensCount += totalSmensCount;
          allTotalsTotalObject.allWeekenedHours += totalWeekendsHours;
          allTotalsTotalObject.allWeekendSmensCount += totalWeekendSmensCount;
          allTotalsTotalObject.А += totalLetters.А;
          allTotalsTotalObject.Б += totalLetters.Б;
          allTotalsTotalObject.В += totalLetters.В;
          allTotalsTotalObject.МО += totalLetters.МО;
          allTotalsTotalObject.П += totalLetters.П;
          allTotalsTotalObject.О += totalLetters.О;

          // applyAlignment(worksheet, totalHoursWeekends, totalWeekendsHours);
          // applyAlignment(worksheet, totalSmensWeekends, totalWeekendSmensCount);
        }

        facilityStart =
          facilityStart +
          (allowOnlyTotal
            ? 1
            : allowAllTypes
              ? 3
              : allowDayNight || allowDayOverwork || allowNightOverwork
                ? 2
                : 1);

        facilityEnd =
          facilityStart +
          (integers?.allowOnlyTotal
            ? 0
            : allowAllTypes
              ? 2
              : allowDayNight || allowDayOverwork || allowNightOverwork
                ? 1
                : 0);
        startCell = incrementColumn(startCell);
      }

      const totalNameCell = `A${facilityStart}:A${facilityStart + 3}`;
      const letter1Cell = `A${facilityStart + 4}`;
      const letter2Cell = `A${facilityStart + 5}`;
      const letter3Cell = `A${facilityStart + 6}`;
      const letter4Cell = `A${facilityStart + 7}`;
      const letter5Cell = `A${facilityStart + 8}`;
      const letter6Cell = `A${facilityStart + 9}`;

      worksheet.mergeCells(totalNameCell);
      applyAlignment(worksheet, totalNameCell, 'Итоги');

      applyAlignment(worksheet, letter1Cell, 'П');
      applyAlignment(worksheet, letter2Cell, 'Б');
      applyAlignment(worksheet, letter3Cell, 'В');
      applyAlignment(worksheet, letter4Cell, 'О');
      applyAlignment(worksheet, letter5Cell, 'МО');
      applyAlignment(worksheet, letter6Cell, 'А');

      const onlyHoursCell = `B${facilityStart}`;
      const dayCell = `B${facilityStart + 1}`;
      const nightCell = `B${facilityStart + 2}`;
      const overworkCell = `B${facilityStart + 3}`;

      applyAlignment(worksheet, onlyHoursCell, 'ч');
      applyAlignment(worksheet, dayCell, 'д');
      applyAlignment(worksheet, nightCell, 'н');
      applyAlignment(worksheet, overworkCell, 'п');

      let newStartColumn = 'C';
      for (let i = 0; i < dates?.length; i++) {
        const isWeekend = dates[i]?.isWeekend;
        const dayName = dates[i]?.fullDate;

        const totalObjByDay = allTotalsObject?.[dayName];

        const onlyHoursCell = `${newStartColumn}${facilityStart}`;
        const dayCell = `${newStartColumn}${facilityStart + 1}`;
        const nightCell = `${newStartColumn}${facilityStart + 2}`;
        const overworkCell = `${newStartColumn}${facilityStart + 3}`;

        const letter1Cell = `${newStartColumn}${facilityStart + 4}`;
        const letter2Cell = `${newStartColumn}${facilityStart + 5}`;
        const letter3Cell = `${newStartColumn}${facilityStart + 6}`;
        const letter4Cell = `${newStartColumn}${facilityStart + 7}`;
        const letter5Cell = `${newStartColumn}${facilityStart + 8}`;
        const letter6Cell = `${newStartColumn}${facilityStart + 9}`;

        applyAlignment(
          worksheet,
          onlyHoursCell,
          totalObjByDay?.onlyTotal ?? 0,
          undefined,
          isWeekend,
        );
        applyAlignment(
          worksheet,
          dayCell,
          totalObjByDay?.day ?? 0,
          undefined,
          isWeekend,
        );
        applyAlignment(
          worksheet,
          nightCell,
          totalObjByDay?.night ?? 0,
          undefined,
          isWeekend,
        );
        applyAlignment(
          worksheet,
          overworkCell,
          totalObjByDay?.overwork ?? 0,
          undefined,
          isWeekend,
        );
        //Буквы
        applyAlignment(
          worksheet,
          letter1Cell,
          totalObjByDay?.П ?? 0,
          undefined,
          isWeekend,
        );
        applyAlignment(
          worksheet,
          letter2Cell,
          totalObjByDay?.Б ?? 0,
          undefined,
          isWeekend,
        );
        applyAlignment(
          worksheet,
          letter3Cell,
          totalObjByDay?.В ?? 0,
          undefined,
          isWeekend,
        );
        applyAlignment(
          worksheet,
          letter4Cell,
          totalObjByDay?.О ?? 0,
          undefined,
          isWeekend,
        );
        applyAlignment(
          worksheet,
          letter5Cell,
          totalObjByDay?.МО ?? 0,
          undefined,
          isWeekend,
        );
        applyAlignment(
          worksheet,
          letter6Cell,
          totalObjByDay?.А ?? 0,
          undefined,
          isWeekend,
        );

        newStartColumn = incrementColumn(newStartColumn);
      }

      const nextColumn = incrementColumn(newStartColumn);

      const totalSmens = incrementColumn(nextColumn);
      const totalHoursWeekends = incrementColumn(totalSmens);
      const totalSmensWeekends = incrementColumn(totalHoursWeekends);

      const total1 = incrementColumn(totalSmensWeekends);
      const total2 = incrementColumn(total1);
      const total3 = incrementColumn(total2);
      const total4 = incrementColumn(total3);
      const total5 = incrementColumn(total4);
      const total6 = incrementColumn(total5);

      const totalHoursCell = `${newStartColumn}${facilityStart}:${nextColumn}${facilityStart}`;
      const dayHoursCell = `${newStartColumn}${facilityStart + 1}:${nextColumn}${facilityStart + 1}`;
      const nightHoursCell = `${newStartColumn}${facilityStart + 2}:${nextColumn}${facilityStart + 2}`;
      const overworkFirstCell = `${newStartColumn}${facilityStart + 3}`;
      const overworkSecondCell = `${nextColumn}${facilityStart + 3}`;

      worksheet.mergeCells(dayHoursCell);
      worksheet.mergeCells(totalHoursCell);
      worksheet.mergeCells(nightHoursCell);

      applyAlignment(
        worksheet,
        totalHoursCell,
        allTotalsTotalObject?.onlyTotalHours,
      );
      applyAlignment(
        worksheet,
        dayHoursCell,
        allTotalsTotalObject?.totalDayHours,
      );
      applyAlignment(
        worksheet,
        nightHoursCell,
        allTotalsTotalObject?.totalNightHours,
      );
      applyAlignment(
        worksheet,
        overworkFirstCell,
        allTotalsTotalObject?.totalOverworkFirstPartHours,
      );
      applyAlignment(
        worksheet,
        overworkSecondCell,
        allTotalsTotalObject?.totalOverworkSecondPartHours,
      );

      worksheet.mergeCells(
        `${totalSmens}${facilityStart}:${totalSmens}${facilityStart + 3}`,
      );
      worksheet.mergeCells(
        `${totalHoursWeekends}${facilityStart}:${totalHoursWeekends}${facilityStart + 3}`,
      );
      worksheet.mergeCells(
        `${totalSmensWeekends}${facilityStart}:${totalSmensWeekends}${facilityStart + 3}`,
      );
      //Буквы
      worksheet.mergeCells(
        `${total1}${facilityStart}:${total1}${facilityStart + 3}`,
      );
      worksheet.mergeCells(
        `${total2}${facilityStart}:${total2}${facilityStart + 3}`,
      );
      worksheet.mergeCells(
        `${total3}${facilityStart}:${total3}${facilityStart + 3}`,
      );
      worksheet.mergeCells(
        `${total4}${facilityStart}:${total4}${facilityStart + 3}`,
      );
      worksheet.mergeCells(
        `${total5}${facilityStart}:${total5}${facilityStart + 3}`,
      );
      worksheet.mergeCells(
        `${total6}${facilityStart}:${total6}${facilityStart + 3}`,
      );

      applyAlignment(
        worksheet,
        `${totalSmens}${facilityStart}:${totalSmens}${facilityStart + 3}`,
        allTotalsTotalObject?.totalSmensCount,
      );
      applyAlignment(
        worksheet,
        `${totalHoursWeekends}${facilityStart}:${totalHoursWeekends}${facilityStart + 3}`,
        allTotalsTotalObject?.allWeekenedHours,
      );
      applyAlignment(
        worksheet,
        `${totalSmensWeekends}${facilityStart}:${totalSmensWeekends}${facilityStart + 3}`,
        allTotalsTotalObject?.allWeekendSmensCount,
      );
      //Буквы
      applyAlignment(
        worksheet,
        `${total1}${facilityStart}:${total1}${facilityStart + 3}`,
        allTotalsTotalObject?.П,
      );
      applyAlignment(
        worksheet,
        `${total2}${facilityStart}:${total2}${facilityStart + 3}`,
        allTotalsTotalObject?.Б,
      );
      applyAlignment(
        worksheet,
        `${total3}${facilityStart}:${total3}${facilityStart + 3}`,
        allTotalsTotalObject?.В,
      );
      applyAlignment(
        worksheet,
        `${total4}${facilityStart}:${total4}${facilityStart + 3}`,
        allTotalsTotalObject?.О,
      );
      applyAlignment(
        worksheet,
        `${total5}${facilityStart}:${total5}${facilityStart + 3}`,
        allTotalsTotalObject?.МО,
      );
      applyAlignment(
        worksheet,
        `${total6}${facilityStart}:${total6}${facilityStart + 3}`,
        allTotalsTotalObject?.А,
      );
    }

    const stream = new PassThrough();
    await workbook.xlsx.write(stream);
    stream.end();

    return new StreamableFile(stream);
  }

  findAll() {}

  update(id: number, updateWorkLogDto: UpdateWorkLogDto) {
    return `This action updates a #${id} workLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} workLog`;
  }

  async findFacilityById(id: number, year?: number, month?: number) {
    if (!id) {
      throw new HttpException(
        'Объект с таким id не был передан',
        HttpStatus.BAD_REQUEST,
      );
    }
    const foundFacility = await this.facilitiesModel.findOne({
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
      return await this.facilitiesModel.findOne({
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
}
