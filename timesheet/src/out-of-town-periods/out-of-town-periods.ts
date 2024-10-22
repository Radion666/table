import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Employee } from 'src/employee/employee.model';

@Table({
  tableName: 'out_of_town_periods',
  updatedAt: false,
})
export class OutOfTownPeriod extends Model<OutOfTownPeriod> {
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
    type: DataType.BOOLEAN,
    allowNull: false,
  })
  isOutOfTown: boolean;

  @BelongsTo(() => Employee)
  employee: Employee;
}
