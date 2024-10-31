import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Facilities } from 'src/facilities/facilities.model';
import { Positions } from 'src/positions/positions.model';

@Table({ tableName: 'position_facility' })
export class PositionFacility extends Model<PositionFacility> {
  @ForeignKey(() => Positions)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  positionId: number;

  @ForeignKey(() => Facilities)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  facilityId: number;
}
