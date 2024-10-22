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
import { MasterFacilities } from 'src/master_facilities/master-facilities.model';
import { Positions } from 'src/positions/positions.model';
import { Roles } from 'src/roles/role.model';

interface UserCreationAttrs {
  login: string;
  password: string;
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  position: string;
  role_id: number;
  phoneNumber?: string;
  address?: string;
  departmentId?: number;
  employmentDate?: string;
  workSchedule?: string;
}

@Table({
  tableName: 'users',
})
export class User extends Model<User, UserCreationAttrs> {
  @ApiProperty({
    example: '1',
    description: 'ID пользователя',
  })
  @Column({
    type: DataType.INTEGER,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ApiProperty({
    example: 'login of login',
    description: 'Учетка пользователя',
  })
  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  login: string;

  @ApiProperty({
    example: 'password',
    description: 'Пароль пользователя',
  })
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password: string;

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

  @ForeignKey(() => Positions)
  @Column
  positionId: number;

  @ForeignKey(() => Roles)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  role_id: number;

  @ApiProperty({
    example: '+79001234567',
    description: 'Номер телефона пользователя',
  })
  @Column({
    type: DataType.STRING,
    allowNull: true,
    validate: {
      is: /^\+?[78][0-9]{10}$/,
    },
  })
  phoneNumber: string;

  @ApiProperty({
    example: '2024-10-08 14:30:00',
    description: 'Последний вход в систему',
  })
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastLoginAt?: Date;

  @HasMany(() => MasterFacilities)
  masterFacilities: MasterFacilities[];

  @BelongsTo(() => Positions)
  position: Positions;

  @BelongsTo(() => Roles)
  role: Roles;
}
