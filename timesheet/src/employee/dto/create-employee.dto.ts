import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { EmploymentStatus } from 'src/employment-periods/employment-periods.model';

export class CreateEmployeeDto {
  @ApiProperty({
    example: 1,
    description: 'ID пользователя, который добавил сотрудника',
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  readonly createdById: number;

  @ApiProperty({
    example: 'working',
    description: 'Статус сотрудника (working, fired, archived)',
    enum: ['working', 'fired', 'archived'],
  })
  @IsNotEmpty()
  @IsEnum(['working', 'fired', 'archived'])
  readonly status: EmploymentStatus;
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
    example: true,
    description: 'Иногородний или нет (true/false)',
  })
  @IsNotEmpty()
  @IsBoolean()
  readonly isOutOfTown: boolean;

  @ApiProperty({
    example: 'Петров',
    description: 'Фамилия пользователя',
  })
  @IsString()
  @MinLength(1, {
    message: 'Минимальная длина фамилии - 1 символ',
  })
  readonly lastName: string;

  @ApiProperty({
    example: 'Петр',
    description: 'Имя пользователя',
  })
  @IsString()
  @MinLength(1, {
    message: 'Минимальная длина имяни - 1 символ',
  })
  readonly firstName: string;

  @ApiProperty({
    example: 'Петрович',
    description: 'Отчество пользователя',
  })
  @IsString()
  readonly middleName: string;

  @ApiProperty({
    example: 'город А, улица В',
    description: 'Прописка по паспорту',
  })
  @IsOptional()
  @IsString()
  readonly registeredAddress: string;

  @ApiProperty({
    example: 'город Б, улица Г',
    description: 'Фактическая прописка',
  })
  @IsOptional()
  @IsString()
  readonly actualAddress: string;

  @ApiProperty({
    example: 1,
    description: 'ID объекта, к которому привязан сотрудник',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly facilityId?: number; // ID объекта может быть пустым

  @ApiProperty({
    example: 1,
    description: 'ID должности сотрудника',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly positionId: number;

  @ApiProperty({
    example: 1,
    description: 'ID мастера, к которому привязан сотрудник',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly masterId?: number;

  @ApiProperty({
    example: '2024-20-10',
    description: 'Дата трудоустройства',
  })
  @IsOptional()
  @IsString()
  readonly createdAt?: string;
}
