import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { User } from 'src/users/user.model';

interface RoleCreationAttrs {
  name: string;
  alt_name: string;
}

@Table({
  tableName: 'roles',
})
export class Roles extends Model<Roles, RoleCreationAttrs> {
  //id
  @ApiProperty({
    example: '1',
    description: 'ID роли',
  })
  @Column({
    type: DataType.INTEGER,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;
  //name
  @ApiProperty({
    example: 'master',
    description: 'Наименование роли - EN',
  })
  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  name: string;
  //alt_name
  @ApiProperty({
    example: 'Мастер',
    description: 'Наименование роли - RU',
  })
  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  alt_name: string;

  @HasMany(() => User)
  users: User[];
}
