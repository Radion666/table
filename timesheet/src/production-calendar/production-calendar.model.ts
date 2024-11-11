import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { productionDaysType } from 'src/common/utils/date-utils';
import { Facilities } from 'src/facilities/facilities.model';

@Table({ tableName: 'production_calendars', updatedAt: false })
export class ProductionCalendar extends Model<ProductionCalendar> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => Facilities)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  facilityId: number;

  @BelongsTo(() => Facilities)
  facility: Facilities;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    comment: 'Дата начала действия календаря',
  })
  startDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Дата окончания действия календаря, null - для текущего календаря',
  })
  endDate: Date | null;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: false,
    comment: 'Общие рабочие дни недели, например: ["monday", "tuesday"]',
  })
  workingDays: string[];

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    comment:
      'JSON с исключениями, содержащий месяцы и дни выходных или праздничных дней',
  })
  months: productionDaysType;
}
