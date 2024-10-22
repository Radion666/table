import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Facilities } from 'src/facilities/facilities.model';
import { User } from 'src/users/user.model';

@Table({
  tableName: 'master_facilities',
})
export class MasterFacilities extends Model<MasterFacilities> {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  master_id: number;

  @ForeignKey(() => Facilities)
  @Column({ type: DataType.INTEGER, allowNull: false })
  facility_id: number;

  @BelongsTo(() => User)
  master: User;

  @BelongsTo(() => Facilities)
  facility: Facilities;
}
