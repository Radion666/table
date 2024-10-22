import {
  BelongsTo,
  Column,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { WorkLog } from 'src/work_logs/work-logs.model';

import { DataType } from 'sequelize-typescript';
import { Employee } from 'src/employee/employee.model';
import { Facilities } from 'src/facilities/facilities.model';
import { User } from 'src/users/user.model';
import { WorkDaysType } from 'src/work_logs/dto/types';

@Table({ tableName: 'work_log_changes_logs', updatedAt: false })
export class ChangeLog extends Model<ChangeLog> {
  @Column({
    type: DataType.INTEGER,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => WorkLog)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  workLogId: number;

  @Column({
    type: DataType.JSONB,
  })
  oldValue: WorkDaysType;

  @Column({
    type: DataType.JSONB,
  })
  newValue: WorkDaysType;

  @Column({
    type: DataType.JSONB,
  })
  changes: any;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Employee)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  employeeId: number;

  @ForeignKey(() => Facilities)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  facilityId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  date: string;

  @BelongsTo(() => Employee, 'employeeId')
  employee: Employee;

  @BelongsTo(() => Facilities, 'facilityId')
  facility: Employee;
}
