import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Employee } from 'src/employee/employee.model';
import { Facilities } from 'src/facilities/facilities.model';
import { User } from 'src/users/user.model';
import { ChangeLog } from './change-logs.model';
import { UpdateChangeLogDto } from './dto/update-change_log.dto';

@Injectable()
export class ChangeLogsService {
  constructor(
    @InjectModel(ChangeLog) private changeLogModel: typeof ChangeLog,
  ) {}

  create(
    worklogId: number,
    oldValue: any,
    newValue: any,
    changes: any,
    userId: number,
    employeeId: number,
    facilityId: number,
    date: string,
  ) {
    this.changeLogModel.create({
      workLogId: worklogId,
      oldValue: oldValue,
      newValue: newValue,
      changes: changes,
      userId: userId,
      date: date,
      facilityId: facilityId,
      employeeId: employeeId,
    });
  }

  async findAll(page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;

    const { rows: items, count: totalItems } =
      await this.changeLogModel.findAndCountAll({
        order: [['createdAt', 'desc']],
        attributes: {
          exclude: ['employeeId', 'userId', 'facilityId'],
        },
        offset,
        limit: pageSize,
        include: [
          {
            model: Facilities,
            attributes: ['id', 'name'],
          },
          {
            model: Employee,
            attributes: ['id', 'lastName', 'firstName', 'middleName'],
          },
          {
            model: User,
            attributes: ['id', 'lastName', 'firstName', 'middleName'],
          },
        ],
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

  findOne(id: number) {
    return `This action returns a #${id} changeLog`;
  }

  update(id: number, updateChangeLogDto: UpdateChangeLogDto) {
    return `This action updates a #${id} changeLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} changeLog`;
  }
}
