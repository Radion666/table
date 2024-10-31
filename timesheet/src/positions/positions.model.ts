import {
  BelongsToMany,
  Column,
  DataType,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Facility } from 'src/facilities/entities/facility.entity';
import { Facilities } from 'src/facilities/facilities.model';
import { PositionPeriod } from 'src/position-periods/position-periods.model';
import { PositionFacility } from 'src/positions-facility/positions-facility.model';

@Table({ tableName: 'positions' })
export class Positions extends Model<Positions> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  name: string;

  @HasMany(() => PositionPeriod)
  positionPeriods: PositionPeriod[];

  @BelongsToMany(() => Facilities, () => PositionFacility)
  facilities: Facility[];
}
