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

@Table({
  tableName: 'facility_periods',
  updatedAt: false,
})
export class FacilityPeriod extends Model<FacilityPeriod> {
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

  @ForeignKey(() => Facilities)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  facilityId: number;

  @BelongsTo(() => Facilities)
  facility: Facilities;

  @BelongsTo(() => Employee)
  employee: Employee;
}
