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
import {
  checkDateForSheetValidation,
  getShortUserFio,
  workerStatuses,
} from 'src/common/utils/common';
import { getDaysInMonth } from 'src/common/utils/date-utils';
import {
  applyAlignment,
  incrementColumn,
  setSumWithStep,
} from 'src/common/utils/excel-utils';
import { EmployeeService } from 'src/employee/employee.service';
import { worksheetTableFacilitySettingIntegersType } from 'src/facilities/dto/create-facility.dto';
import { PassThrough } from 'stream';

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
        `Validation errors occurred: ${errors.join('; ')}`,
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

      const newDates = cleanData(newDatesCopy, integers);

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
          `Переданное сотрудника ${employeeShortName} для даты ${dateKey} - некорректно, значение ${dateValue}`,
        );
      }

      if (typeof dateValue === 'object') {
        const day = dateValue?.day ?? 0;
        const night = dateValue?.night ?? 0;
        const overwork = dateValue?.overwork ?? 0;
        const total = dateValue?.total ?? 0;

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
            if (overwork > 8) {
              throw new Error(
                `Значение переработки не может превышать 8 часов`,
              );
            }
            if (localTotal > 24) {
              throw new Error(
                `Суммарное значение ячеек за дату не может превышать 24 часа`,
              );
            }
          } else if (selectedCount === 2) {
            if (day > 8 && integers?.allowDay) {
              throw new Error(`Значение дня не может превышать 8 часов`);
            }
            if (night > 8 && integers?.allowNight) {
              throw new Error(`Значение ночи не может превышать 8 часов`);
            }
            if (overwork > 8 && integers?.allowOverwork) {
              throw new Error(
                `Значение переработки не может превышать 8 часов`,
              );
            }
            if (localTotal > 16) {
              throw new Error(
                `Суммарное значение ячеек за дату превышать 24 часа`,
              );
            }
          } else if (selectedCount === 1) {
            if (day > 8 && integers?.allowDay) {
              throw new Error(`Значение дня не может превышать 8 часа`);
            }
            if (night > 8 && integers?.allowNight) {
              throw new Error(`Значение ночи не может превышать 8 часа`);
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

    for (let i = 0; i < allDaysInMonth?.length; i++) {
      const fullDate = allDaysInMonth[i].fullDate;
      const parsedDate = dayjs(parseDate(fullDate));

      if (dates[fullDate]) {
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
            (endDate?.isAfter(parsedDate) ||
              endDate?.isSame(parsedDate, 'day')) &&
            dayjs(endDate)?.diff(startDate, 'hour') > 1
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
            parsedDate.isAfter(newPeriod?.startDate)
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

    const targetDate = dayjs(date, 'MM-YYYY');
    const currentDate = dayjs();

    const monthDifference = targetDate.diff(currentDate, 'month');

    const allowedEmployees = await this.employeeService.findByFacilityId(
      facilityId,
      date,
    );

    const workLogsData = await this.findByDate(date, facilityId);

    const dates = getDaysInMonth(monthDifference);

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Пример');

    worksheet.mergeCells('A1:A4');
    worksheet.mergeCells('B1:B4');
    worksheet.mergeCells('C1:C4');

    worksheet.columns = [
      { header: 'Работник', key: 'id', width: 25 },
      { header: 'Местный (0) / неместный (1)', key: 'name', width: 35 },
      { header: '', key: '', width: 10 },
    ];

    let startColumn = 'D';

    for (let i = 0; i < dates?.length; i++) {
      const day = dates[i];
      const isWeekend = day.isWeekend;

      const dayCell = `${startColumn}1:${startColumn}2`;
      const dayNameCell = `${startColumn}3:${startColumn}4`;

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

      const upperCell = worksheet.getCell(`${startColumn}1:${startColumn}2`);
      const bottomCell = worksheet.getCell(`${startColumn}3:${startColumn}4`);

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

    const totalHoursRow = `${startColumn}1:${nextColumn}1`;
    const totalDayHoursRow = `${startColumn}2:${nextColumn}2`;
    const totalNigthHoursRow = `${startColumn}3:${nextColumn}3`;
    const totalFirstTwoHoursRow = `${startColumn}4`;
    const totalSecondTwoHoursRow = `${nextColumn}4`;
    const totalSmensRow = `${totalSmens}1:${totalSmens}4`;
    const totalHoursSecondRow = `${totalHours}1:${totalHours}4`;
    const totalSmensWeekendsRow = `${totalSmensWeekends}1:${totalSmensWeekends}4`;

    worksheet.mergeCells(totalHoursRow);
    worksheet.mergeCells(totalDayHoursRow);
    worksheet.mergeCells(totalNigthHoursRow);
    worksheet.mergeCells(totalSmensRow);
    worksheet.mergeCells(totalHoursSecondRow);
    worksheet.mergeCells(totalSmensWeekendsRow);

    applyAlignment(worksheet, totalHoursRow, 'Итого часов');
    applyAlignment(worksheet, totalDayHoursRow, 'Дневные');
    applyAlignment(worksheet, totalNigthHoursRow, 'Ночные');
    applyAlignment(worksheet, totalFirstTwoHoursRow, 'Перв. 2 ч');
    applyAlignment(worksheet, totalSecondTwoHoursRow, 'Более 2 ч');
    applyAlignment(worksheet, totalSmensRow, 'Итого смен', 20);
    applyAlignment(worksheet, totalHoursSecondRow, 'Итого часов (вых)', 20);
    applyAlignment(worksheet, totalSmensWeekendsRow, 'Итого смен (вых)', 20);

    const a1a2Cell = worksheet.getCell('A1:A2');
    const b1b2Cell = worksheet.getCell('B1:B2');

    a1a2Cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
    b1b2Cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    let employeeStart = 5;
    let employeeEnd = 7;

    for (let i = 0; i < allowedEmployees?.length; i++) {
      const employee = allowedEmployees[i];

      const fioCell = `A${employeeStart}:A${employeeEnd}`;
      const isLocalCell = `B${employeeStart}:B${employeeEnd}`;
      const dayCell = `C${employeeStart}`;
      const nightCell = `C${employeeStart + 1}`;
      const overworkCell = `C${employeeStart + 2}`;

      worksheet.getCell(fioCell).value = `${getShortUserFio(employee)}`;
      worksheet.getCell(isLocalCell).value = employee.lastIsOutOfTown ? 1 : 0;
      worksheet.getCell(dayCell).value = 'д';
      worksheet.getCell(nightCell).value = 'н';
      worksheet.getCell(overworkCell).value = 'п';

      worksheet.mergeCells(fioCell);
      worksheet.mergeCells(isLocalCell);

      applyAlignment(worksheet, fioCell);
      applyAlignment(worksheet, isLocalCell);
      applyAlignment(worksheet, dayCell);
      applyAlignment(worksheet, nightCell);
      applyAlignment(worksheet, overworkCell);

      const foundEmployee = workLogsData.find(
        (el) => el.employee?.id === employee?.id,
      );

      let startColumn = 'D';

      for (let j = 0; j < dates?.length; j++) {
        const day = dates[j];
        const isWeekend = day.isWeekend;

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
                isWeekend ? true : undefined,
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
              isWeekend ? true : undefined,
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
            if (dayjs(newPeriod?.startDate)?.isAfter(cellDate)) {
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
                isWeekend ? true : undefined,
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
              isWeekend ? true : undefined,
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
          const cellId = `${startColumn}${employeeStart}:${startColumn}${employeeEnd}`;
          worksheet.getCell(cellId).value = cellData;
          worksheet.mergeCells(cellId);

          applyAlignment(
            worksheet,
            cellId,
            undefined,
            undefined,
            isWeekend ? true : undefined,
          );
        } else if (typeof cellData === 'object' && cellData !== null) {
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
            isWeekend ? true : undefined,
          );
          applyAlignment(
            worksheet,
            nightCellId,
            undefined,
            undefined,
            isWeekend ? true : undefined,
          );
          applyAlignment(
            worksheet,
            overworkCellId,
            undefined,
            undefined,
            isWeekend ? true : undefined,
          );
        }

        startColumn = incrementColumn(startColumn);
      }

      const nextColumn = incrementColumn(startColumn);
      const totalSmens = incrementColumn(nextColumn);
      const totalHoursWeekends = incrementColumn(totalSmens);
      const totalSmensWeekends = incrementColumn(totalHoursWeekends);

      const totalDayHoursCell = `${startColumn}${employeeStart}:${nextColumn}${employeeStart}`;
      const totalNightHoursCell = `${startColumn}${employeeStart + 1}:${nextColumn}${employeeStart + 1}`;
      const totalOverworkFirstHoursCell = `${startColumn}${employeeEnd}`;
      const totalOverworkSecondHoursCell = `${nextColumn}${employeeEnd}`;

      const totalSmensCell = `${totalSmens}${employeeStart}:${totalSmens}${employeeEnd}`;
      const totalWeekendsHoursCell = `${totalHoursWeekends}${employeeStart}:${totalHoursWeekends}${employeeEnd}`;
      const totalWeekendsSmensCell = `${totalSmensWeekends}${employeeStart}:${totalSmensWeekends}${employeeEnd}`;

      worksheet.mergeCells(totalDayHoursCell);
      worksheet.mergeCells(totalNightHoursCell);
      worksheet.mergeCells(totalSmensCell);
      worksheet.mergeCells(totalWeekendsHoursCell);
      worksheet.mergeCells(totalWeekendsSmensCell);

      const dayHoursCells: string[] = [];
      const nightHoursCells: string[] = [];

      const totalWeekendCells: string[] = [];

      let countOfWorkDays: number = 0;

      let countOfWeekendWorkDays: number = 0;

      let hoursOfOverworkTwoHours: number = 0;
      let hoursOfOverworkMoreTwoHours: number = 0;

      let newStartColumn = 'D';

      for (let j = 0; j < dates?.length; j++) {
        const day = dates[j];
        const isWeekend = day.isWeekend;
        const cellData = foundEmployee?.workDays?.[day.fullDate];

        if (typeof cellData === 'object' && cellData?.overwork && !isWeekend) {
          const value = +(cellData?.overwork ?? 0);

          if (value <= 2) {
            hoursOfOverworkTwoHours += value;
          }
          if (value > 2) {
            hoursOfOverworkTwoHours += 2;
            hoursOfOverworkMoreTwoHours += value - 2;
          }
        }

        if (typeof cellData === 'object' && !isWeekend) {
          dayHoursCells.push(`${newStartColumn}${employeeStart}`);
          nightHoursCells.push(`${newStartColumn}${employeeStart + 1}`);
          if (+cellData?.day || +cellData?.night) {
            countOfWorkDays += 1;
          }
        } else if (typeof cellData === 'object' && isWeekend) {
          totalWeekendCells.push(`${newStartColumn}${employeeStart}`);
          totalWeekendCells.push(`${newStartColumn}${employeeStart + 1}`);

          if (+cellData?.day || +cellData?.night) {
            countOfWeekendWorkDays += 1;
          }
        }

        newStartColumn = incrementColumn(newStartColumn);
      }

      worksheet.getCell(totalDayHoursCell).value = dayHoursCells?.length
        ? {
            formula: `SUM(${dayHoursCells.join(', ')})`,
          }
        : 0;
      worksheet.getCell(totalNightHoursCell).value = nightHoursCells?.length
        ? {
            formula: `SUM(${nightHoursCells.join(', ')})`,
          }
        : 0;
      worksheet.getCell(totalOverworkFirstHoursCell).value =
        hoursOfOverworkTwoHours;
      worksheet.getCell(totalOverworkSecondHoursCell).value =
        hoursOfOverworkMoreTwoHours;

      worksheet.getCell(totalSmensCell).value = countOfWorkDays;
      worksheet.getCell(totalWeekendsHoursCell).value =
        totalWeekendCells?.length
          ? {
              formula: `SUM(${totalWeekendCells.join(', ')})`,
            }
          : 0;
      worksheet.getCell(totalWeekendsSmensCell).value = countOfWeekendWorkDays;

      applyAlignment(worksheet, totalDayHoursCell);
      applyAlignment(worksheet, totalNightHoursCell);
      applyAlignment(worksheet, totalOverworkFirstHoursCell);
      applyAlignment(worksheet, totalOverworkSecondHoursCell);
      applyAlignment(worksheet, totalSmensCell);
      applyAlignment(worksheet, totalWeekendsHoursCell);
      applyAlignment(worksheet, totalWeekendsSmensCell);

      employeeStart = employeeStart + 3;
      employeeEnd = employeeEnd + 3;
    }

    const totalDayCell = `A${employeeStart}`;
    const totalNightCell = `A${employeeStart + 1}`;
    const totalOverworkCell = `A${employeeEnd}`;

    worksheet.getCell(totalDayCell).value = 'Итого: дневных';
    worksheet.getCell(totalNightCell).value = 'Итого: ночных';
    worksheet.getCell(totalOverworkCell).value = 'Итого: переработка';

    applyAlignment(worksheet, totalDayCell);
    applyAlignment(worksheet, totalNightCell);
    applyAlignment(worksheet, totalOverworkCell);

    let totalStartColumn = 'D';

    for (let i = 0; i < dates?.length; i++) {
      const dayTargetCellId = `${totalStartColumn}${employeeStart}`;
      const nightTargetCellId = `${totalStartColumn}${employeeStart + 1}`;
      const overworkTargetCellId = `${totalStartColumn}${employeeEnd}`;

      const day = dates[i];
      const isWeekend = day.isWeekend;

      setSumWithStep(worksheet, dayTargetCellId, 5, employeeStart, isWeekend);
      setSumWithStep(
        worksheet,
        nightTargetCellId,
        6,
        employeeStart + 1,
        isWeekend,
      );
      setSumWithStep(
        worksheet,
        overworkTargetCellId,
        7,
        employeeEnd,
        isWeekend,
      );

      totalStartColumn = incrementColumn(totalStartColumn);
    }

    const nextTotalColumn = incrementColumn(totalStartColumn);
    const totalTotalSmens = incrementColumn(nextTotalColumn);
    const totalTotalHoursWeekends = incrementColumn(totalTotalSmens);
    const totalTotalSmensWeekends = incrementColumn(totalTotalHoursWeekends);

    const totalDayHoursCell = `${totalStartColumn}${employeeStart}:${nextTotalColumn}${employeeStart}`;
    const totalNightHoursCell = `${totalStartColumn}${employeeStart + 1}:${nextTotalColumn}${employeeStart + 1}`;
    const totalOverworkFirstHoursCell = `${totalStartColumn}${employeeEnd}`;
    const totalOverworkSecondHoursCell = `${nextTotalColumn}${employeeEnd}`;

    const totalSmensCell = `${totalTotalSmens}${employeeStart}:${totalTotalSmens}${employeeEnd}`;
    const totalWeekendsHoursCell = `${totalTotalHoursWeekends}${employeeStart}:${totalTotalHoursWeekends}${employeeEnd}`;
    const totalWeekendsSmensCell = `${totalTotalSmensWeekends}${employeeStart}:${totalTotalSmensWeekends}${employeeEnd}`;

    worksheet.mergeCells(totalDayHoursCell);
    worksheet.mergeCells(totalNightHoursCell);
    worksheet.mergeCells(totalSmensCell);
    worksheet.mergeCells(totalWeekendsHoursCell);
    worksheet.mergeCells(totalWeekendsSmensCell);

    setSumWithStep(worksheet, totalDayHoursCell, 5, employeeStart, false, 3);
    setSumWithStep(worksheet, totalNightHoursCell, 6, employeeStart, false, 3);
    setSumWithStep(
      worksheet,
      totalOverworkFirstHoursCell,
      7,
      employeeStart,
      false,
      3,
    );
    setSumWithStep(
      worksheet,
      totalOverworkSecondHoursCell,
      7,
      employeeStart,
      false,
      3,
    );
    setSumWithStep(worksheet, totalSmensCell, 5, employeeStart, false, 3);
    setSumWithStep(
      worksheet,
      totalWeekendsHoursCell,
      5,
      employeeStart,
      false,
      3,
    );
    setSumWithStep(
      worksheet,
      totalWeekendsSmensCell,
      5,
      employeeStart,
      false,
      3,
    );

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
}
