import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { PositionPeriod } from 'src/position-periods/position-periods.model';

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
}
