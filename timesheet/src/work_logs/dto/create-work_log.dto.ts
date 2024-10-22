import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class DailyLogDTO {
  @ApiProperty({
    example: '5',
    description: 'Часы работы в дневную смену',
    required: false,
  })
  @IsOptional()
  @IsString()
  day?: string;

  @ApiProperty({
    example: '2',
    description: 'Часы работы в ночную смену',
    required: false,
  })
  @IsOptional()
  @IsString()
  night?: string;

  @ApiProperty({
    example: '3',
    description: 'Часы переработки',
    required: false,
  })
  @IsOptional()
  @IsString()
  overwork?: string;
}

class TotalDTO {
  @ApiProperty({
    example: 14,
    description: 'Количество часов работы в дневную смену',
  })
  @IsNotEmpty()
  @IsNumber()
  hoursOfDay: number;

  @ApiProperty({
    example: 16,
    description: 'Количество часов работы в ночную смену',
  })
  @IsNotEmpty()
  @IsNumber()
  hoursOfNight: number;

  @ApiProperty({
    example: 6,
    description: 'Количество рабочих дней',
  })
  @IsNotEmpty()
  @IsNumber()
  countOfWorkDays: number;

  @ApiProperty({
    example: 0,
    description: 'Количество рабочих дней в выходные',
  })
  @IsNotEmpty()
  @IsNumber()
  countOfWeekendWorkDays: number;

  @ApiProperty({
    example: 0,
    description: 'Количество часов работы в выходные дни',
  })
  @IsNotEmpty()
  @IsNumber()
  hoursOfWeekendWorkDays: number;

  @ApiProperty({
    example: 10,
    description: 'Количество часов переработки больше двух часов',
  })
  @IsNotEmpty()
  @IsNumber()
  hoursOfOverworkTwoHours: number;

  @ApiProperty({
    example: 11,
    description: 'Количество часов переработки больше чем два часа',
  })
  @IsNotEmpty()
  @IsNumber()
  hoursOfOverworkMoreTwoHours: number;
}

export class createOrUpdateWorkLogsDto {
  @ApiProperty({
    example: 1,
    description: 'ID объекта',
  })
  @IsNotEmpty()
  @IsNumber()
  facilityId: number;

  @ApiProperty({
    description: 'Данные о рабочих сменах по датам',
    type: 'object',
    additionalProperties: { type: 'object' }, // Указать, что это объект с динамическими ключами
  })
  @ValidateNested({ each: true })
  @Type(() => DailyLogDTO)
  dates: Record<string, DailyLogDTO | string>;

  @ApiProperty({
    example: 2,
    description: 'ID работника',
  })
  @IsNotEmpty()
  @IsNumber()
  employeeId: number;

  @ApiProperty({
    description: 'Общие данные о рабочем времени',
    type: TotalDTO,
  })
  @ValidateNested()
  @Type(() => TotalDTO)
  total: TotalDTO;
}
