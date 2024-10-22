import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Employee } from 'src/employee/employee.model';
import { Facilities } from 'src/facilities/facilities.model';
import { WorkDaysType } from './dto/types';

@Table({ tableName: 'work_logs', createdAt: false, updatedAt: false })
export class WorkLog extends Model<WorkLog> {
  @Column({
    type: DataType.INTEGER,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

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

  @Column({
    type: DataType.JSONB,
  })
  workDays: WorkDaysType[];

  @BelongsTo(() => Employee, 'employeeId')
  employee: Employee;
}
