import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Employee } from 'src/employee/employee.model';

export enum EmploymentStatus {
  WORKING = 'working',
  FIRED = 'fired',
  ARCHIVED = 'archived',
}
@Table({
  tableName: 'employment_periods',
  updatedAt: false,
})
export class EmploymentPeriod extends Model<EmploymentPeriod> {
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  employeeId: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  startDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  endDate: Date | null;

  @Column({
    type: DataType.ENUM(...Object.values(EmploymentStatus)),
    allowNull: false,
  })
  status: EmploymentStatus;

  @BelongsTo(() => Employee)
  employee: Employee;
}
