import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  //login
  @ApiProperty({
    example: 'login of login',
    description: 'Учетка пользователя',
  })
  @IsNotEmpty()
  @IsString({
    message: 'Должно быть строкой',
  })
  readonly login: string;
  //password
  @ApiProperty({
    example: 'password',
    description: 'Пароль пользователя',
  })
  @IsNotEmpty()
  readonly password: string;
  //lastName
  @ApiProperty({
    example: 'Петров',
    description: 'Фамилия пользователя',
  })
  @IsNotEmpty()
  @IsString({
    message: 'Фамилия должно быть строкой',
  })
  // @Length(6, 20, {
  //   message: 'Длина фамилии должна быть не менее 6 символов',
  // })
  readonly lastName: string;
  //firstName
  @ApiProperty({
    example: 'Петр',
    description: 'Имя пользователя',
  })
  @IsNotEmpty()
  @IsString({
    message: 'Имя должно быть строкой',
  })
  // @Length(6, 20, {
  //   message: 'Длина имени должна быть не менее 6 символов',
  // })
  readonly firstName: string;
  //middleName
  @ApiProperty({
    example: 'Петрович',
    description: 'Отчество пользователя',
  })
  @IsNotEmpty()
  @IsString({
    message: 'Отчество должно быть строкой',
  })
  // @Length(6, 20, {
  //   message: 'Длина отчества должна быть не менее 6 символов',
  // })
  middleName: string;

  //position
  @ApiProperty({
    example: 1,
    description: 'ID должности сотрудника',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly positionId: number;
  //role
  @IsOptional()
  @IsNumber()
  @ApiProperty({
    example: 0,
    description: 'Роль пользователя',
  })
  role_id: number;
  //phoneNumber
  @ApiProperty({
    example: '+71111111111',
    description:
      'Номер телефона сотрудника в формате +71111111111 или 81111111111',
  })
  @Matches(/^\+?[78]\d{10}$/, {
    message:
      'Неверный формат номера телефона. Ожидается формат +7XXXXXXXXXX или 8XXXXXXXXXX',
  })
  readonly phoneNumber: string;

  @ApiProperty({
    example: 'Полный рабочий день',
    description: 'График работы пользователя',
  })
  workSchedule: string;
  //lastLoginAt
  @IsOptional()
  @IsDateString()
  @ApiProperty({
    example: '2024-10-08 14:30:00',
    description: 'Последний вход в систему',
  })
  lastLoginAt?: string;
}
