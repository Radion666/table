import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Employee } from 'src/employee/employee.model';
import { User } from 'src/users/user.model';

@Table({
  tableName: 'master_periods',
  updatedAt: false,
})
export class MasterPeriod extends Model<MasterPeriod> {
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  employeeId: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  startDate: Date | null;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  endDate: Date | null;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  masterId: number;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Employee)
  employee: Employee;
}
