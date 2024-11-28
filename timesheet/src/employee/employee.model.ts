import { ApiProperty } from '@nestjs/swagger';
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import {
  EmploymentPeriod,
  EmploymentStatus,
} from 'src/employment-periods/employment-periods.model';
import { Facilities } from 'src/facilities/facilities.model';
import { FacilityPeriod } from 'src/facility-periods/facility-periods.model';
import { MasterPeriod } from 'src/master-periods/master-periods.model';
import { OutOfTownPeriod } from 'src/out-of-town-periods/out-of-town-periods';
import { PositionPeriod } from 'src/position-periods/position-periods.model';
import { Positions } from 'src/positions/positions.model';
import { User } from '../users/user.model';

@Table({ tableName: 'employees' })
export class Employee extends Model<Employee> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  dateAdded: Date;

  @ForeignKey(() => User)
  @Column
  createdById: number;

  @ApiProperty({
    example: 'Петров',
    description: 'Фамилия пользователя',
  })
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  lastName: string;

  @ApiProperty({
    example: 'Петр',
    description: 'Имя пользователя',
  })
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  firstName: string;

  @ApiProperty({
    example: 'Петрович',
    description: 'Отчество пользователя',
  })
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  middleName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    validate: {
      is: /^\+?[78][0-9]{10}$/,
    },
  })
  phoneNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  registeredAddress: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  actualAddress: string;

  @Column({
    type: DataType.ENUM(...Object.values(EmploymentStatus)),
    allowNull: false,
  })
  lastStatus: EmploymentStatus;

  @ForeignKey(() => Facilities)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  lastFacilityId: number;
  @BelongsTo(() => Facilities, 'lastFacilityId')
  lastFacility: Facilities;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  lastMasterId: number;
  @BelongsTo(() => User, 'lastMasterId')
  lastMaster: User;

  @ForeignKey(() => Positions)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  lastPositionId: number;
  @BelongsTo(() => Positions, 'lastPositionId')
  lastPosition: Positions;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
  })
  lastIsOutOfTown: boolean;

  @BelongsTo(() => User, 'createdById')
  creator: User;

  @HasMany(() => EmploymentPeriod, { onDelete: 'CASCADE' })
  employmentPeriods: EmploymentPeriod[];

  @HasMany(() => FacilityPeriod, { onDelete: 'CASCADE' })
  facilityPeriods: FacilityPeriod[];

  @HasMany(() => MasterPeriod, { onDelete: 'CASCADE' })
  masterPeriods: MasterPeriod[];

  @HasMany(() => OutOfTownPeriod, { onDelete: 'CASCADE' })
  outOfTownPeriods: OutOfTownPeriod[];

  @HasMany(() => PositionPeriod, { onDelete: 'CASCADE' })
  positionPeriods: PositionPeriod[];
}
