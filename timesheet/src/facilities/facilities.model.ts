import { ApiProperty } from '@nestjs/swagger';
import {
  BelongsToMany,
  Column,
  DataType,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { FacilityPeriod } from 'src/facility-periods/facility-periods.model';
import { MasterFacilities } from 'src/master_facilities/master-facilities.model';
import { PositionFacility } from 'src/positions-facility/positions-facility.model';
import { Positions } from 'src/positions/positions.model';
import { facilityTimeSheetSettingType } from './dto/create-facility.dto';

interface FacilitiyCreationAttrs {
  name: string;
  alt_name: string;
}

@Table({
  tableName: 'facilities',
})
export class Facilities extends Model<Facilities, FacilitiyCreationAttrs> {
  //id
  @ApiProperty({
    example: '1',
    description: 'ID объекта',
  })
  @Column({
    type: DataType.INTEGER,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;
  // Наименование объекта
  @ApiProperty({
    example: 'Объект 1',
    description: 'Наименование объекта',
  })
  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  name: string;
  // Адрес объекта
  @ApiProperty({
    example: 'город А, улица В',
    description: 'Наименование адреса объект',
  })
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  address: string;

  @ApiProperty({
    example: 'Объект такой то такой то',
    description: 'Характеристика объекта',
  })
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.JSONB,
  })
  settings: facilityTimeSheetSettingType;

  @HasMany(() => MasterFacilities)
  masterFactories: MasterFacilities[];

  @HasMany(() => FacilityPeriod)
  facilityPeriods: FacilityPeriod[];

  @BelongsToMany(() => Positions, () => PositionFacility)
  positions: Positions[];
}
