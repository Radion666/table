import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Employee } from 'src/employee/employee.model';
import { Positions } from 'src/positions/positions.model';

@Table({
  tableName: 'position_periods',
  updatedAt: false,
})
export class PositionPeriod extends Model<PositionPeriod> {
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

  @ForeignKey(() => Positions)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  positionId: number;

  @BelongsTo(() => Positions)
  position: Positions;

  @BelongsTo(() => Employee)
  employee: Employee;
}
