import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePositionDto {
  @ApiProperty({
    example: 'Мастер',
    description: 'Наименование должности',
  })
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @ApiProperty({
    example: '[1,2,3,4,5]',
    description: 'Массив объектов',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  readonly facilities: number[];
}
